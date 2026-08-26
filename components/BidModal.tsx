"use client";

import { useEffect, useRef, useState } from "react";
import { RULES, formatBRL, priceToBeat } from "@/lib/site";
import type { RankRow } from "@/lib/types";

const FLAGS = ["🇧🇷", "🇵🇹", "🇺🇸", "🇪🇸", "🇦🇷", "🇺🇾", "🌐"];
const CATEGORIES = [
  "💻 Tecnologia",
  "📈 Negócios",
  "🎮 Games",
  "🎨 Arte",
  "📚 Educação",
  "💰 Finanças",
  "😂 Humor",
  "🎵 Música",
];

type Stage = "form" | "checkout" | "paid";

interface BidResponse {
  bidId: string;
  mode: "pix_qr" | "redirect";
  pixQr: string;
  pixCode: string;
  checkoutUrl: string;
  amountCents: number;
  provider: string;
}

export default function BidModal({
  initialHandle,
  initialAmountCents,
  targetName,
  ranking = [],
  onClose,
  onPaid,
}: {
  initialHandle?: string;
  initialAmountCents?: number;
  targetName?: string;
  ranking?: RankRow[];
  onClose: () => void;
  onPaid: () => void;
}) {
  // Monto base (contexto de apertura: entrar / robar un puesto)
  const baseMin = Math.max(initialAmountCents ?? RULES.minEntryCents, RULES.minEntryCents);

  const [stage, setStage] = useState<Stage>("form");
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [country, setCountry] = useState("🇧🇷");
  const [category, setCategory] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [reais, setReais] = useState<string>((baseMin / 100).toFixed(2));
  const [showSug, setShowSug] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bid, setBid] = useState<BidResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Polling del estado del pago (sirve para QR y para redirect via webhook)
  useEffect(() => {
    if (stage !== "checkout" || !bid) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${bid.bidId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.status === "paid") {
          if (pollRef.current) clearInterval(pollRef.current);
          setStage("paid");
          setTimeout(onPaid, 1800);
        } else if (json.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError("O pagamento expirou. Tente de novo.");
          setStage("form");
        }
      } catch {
        /* reintenta */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stage, bid, onPaid]);

  // Monto elegido en centavos (a partir del texto en R$)
  const chosenCents = Math.round(parseFloat(reais.replace(",", ".") || "0") * 100);

  const handleLower = handle.trim().toLowerCase().replace(/^@/, "");

  // ── Autocompletado: creadores que ya están pujando ──
  const suggestions = ranking
    .filter((r) => {
      if (!handleLower) return true;
      return (
        r.handle.includes(handleLower) ||
        r.name.toLowerCase().includes(handleLower)
      );
    })
    .slice(0, 6);
  // ¿El @ escrito coincide con alguien del ranking? (turbinar/empujar)
  const existingMatch = ranking.find((r) => r.handle === handleLower) || null;

  // Mínimo dinámico: turbinar a alguien exige superar su puja actual
  const minCents = existingMatch
    ? priceToBeat(existingMatch.amountCents)
    : baseMin;

  // ── Previa do combate: dónde caés y a quién hundís ──
  const validBid = chosenCents >= minCents;
  const sortedOthers = [...ranking]
    .filter((r) => r.handle !== handleLower)
    .sort((a, b) => b.amountCents - a.amountCents);
  let insertIdx = sortedOthers.findIndex((r) => chosenCents > r.amountCents);
  if (insertIdx === -1) insertIdx = sortedOthers.length;
  const myRank = insertIdx + 1;
  const aboveRow = insertIdx > 0 ? sortedOthers[insertIdx - 1] : null;
  const sunkRow = insertIdx < sortedOthers.length ? sortedOthers[insertIdx] : null;

  async function submit() {
    setError("");
    if (!handle.trim() || handle.trim().length < 2) {
      setError("Escolha um @ (mínimo 2 caracteres).");
      return;
    }
    if (!chosenCents || chosenCents < minCents) {
      setError(`O lance mínimo aqui é ${formatBRL(minCents)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          amountCents: chosenCents,
          name: name || undefined,
          bio: bio || undefined,
          avatarUrl: avatarUrl || undefined,
          country,
          category: category || undefined,
          links: linkUrl ? [{ type: "link", url: linkUrl }] : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não deu para criar o lance.");
        setSubmitting(false);
        return;
      }
      setBid(json);
      setStage("checkout");
      // En modo redirect, abrimos el checkout de Hotmart automáticamente
      if (json.mode === "redirect" && json.checkoutUrl) {
        window.open(json.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Erro de conexão. Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function simulatePayment() {
    if (!bid) return;
    await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId: bid.bidId }),
    }).catch(() => {});
  }

  function copyCode() {
    if (!bid) return;
    navigator.clipboard?.writeText(bid.pixCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="card-hard max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-cream p-5 thin-scroll sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── FORM ── */}
        {stage === "form" && (
          <>
            <div className="flex items-start justify-between">
              <h3 className="font-marker text-2xl leading-tight">
                {targetName ? `Passar ${targetName}` : "Entrar no ranking"}
              </h3>
              <button
                onClick={onClose}
                className="text-2xl leading-none text-[color:var(--color-ink-soft)]"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
              Escolha seu nível de lance. Quanto maior, mais alto no ranking.
            </p>

            <div className="mt-4 space-y-3">
              <Field label="@ do criador (o seu, ou quem você quer turbinar) *">
                <div className="relative">
                  <input
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value);
                      setShowSug(true);
                    }}
                    onFocus={() => setShowSug(true)}
                    onBlur={() => setTimeout(() => setShowSug(false), 150)}
                    placeholder="seuusuario"
                    className="input"
                    autoComplete="off"
                    autoFocus
                  />
                  {showSug && suggestions.length > 0 && (
                    <ul className="card-hard absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg bg-cream thin-scroll">
                      <li className="border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-ink-soft)]">
                        Já no ranking — pague para turbinar
                      </li>
                      {suggestions.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setHandle(r.handle);
                              setReais(
                                (priceToBeat(r.amountCents) / 100).toFixed(2)
                              );
                              setShowSug(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-cream-200"
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#9b6ee8,#1c1915)] text-[10px] font-bold text-cream">
                              {r.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={r.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                r.name.slice(0, 2).toUpperCase()
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                @{r.handle}
                              </span>
                              <span className="block truncate text-[11px] text-[color:var(--color-ink-soft)]">
                                #{r.rank} · {r.name}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono text-xs font-semibold">
                              {formatBRL(r.amountCents)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {existingMatch && (
                  <p className="mt-1 text-[11px] font-semibold text-[color:var(--color-flame)]">
                    🚀 Você vai turbinar @{existingMatch.handle} (está em{" "}
                    {formatBRL(existingMatch.amountCents)}). Pague mais para
                    subi-lo.
                  </p>
                )}
              </Field>
              {/* Los datos de perfil solo se piden al ENTRAR como creador nuevo.
                  Si estás turbinando a alguien que ya está, se ocultan. */}
              {!existingMatch && (
              <>
              <Field label="Nome exibido">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu Nome"
                  className="input"
                />
              </Field>
              <Field label="Bio curta">
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="O que você faz"
                  className="input"
                  maxLength={120}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="País">
                  <div className="flex flex-wrap gap-1">
                    {FLAGS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCountry(f)}
                        className={`rounded-md border px-2 py-1 text-lg ${
                          country === f
                            ? "border-ink bg-cream-200"
                            : "border-line"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Categoria">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input"
                  >
                    <option value="">—</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Link (perfil / site)">
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="input"
                />
              </Field>
              <Field label="Foto (URL, opcional)">
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://.../foto.jpg"
                  className="input"
                />
              </Field>
              </>
              )}

              {/* Monto libre (sin tope) */}
              <Field label="Seu lance (R$) *">
                <div className="flex items-center overflow-hidden rounded-lg border-2 border-line bg-cream focus-within:border-ink">
                  <span className="pl-3 pr-1 font-mono text-lg text-[color:var(--color-ink-soft)]">
                    R$
                  </span>
                  <input
                    value={reais}
                    onChange={(e) =>
                      setReais(e.target.value.replace(/[^0-9.,]/g, ""))
                    }
                    inputMode="decimal"
                    placeholder="0,00"
                    className="w-full border-0 bg-transparent px-1 py-2 font-mono text-xl font-semibold outline-none"
                  />
                </div>
                {/* Atajos (solo sugerencias — podés escribir cualquier monto) */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from(
                    new Set(
                      [minCents, 1000, 10000, 100000, 1000000].filter(
                        (c) => c >= minCents
                      )
                    )
                  )
                    .slice(0, 4)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setReais((c / 100).toFixed(2))}
                        className="rounded-md border border-line px-2 py-1 font-mono text-xs hover:bg-cream-200"
                      >
                        {formatBRL(c)}
                      </button>
                    ))}
                </div>
                <p className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]">
                  Lance mínimo: {formatBRL(minCents)}. Sem teto — aposte quanto quiser.
                </p>

                {/* Prévia do combate */}
                {validBid && (
                  <div className="mt-3 overflow-hidden rounded-lg border-2 border-ink bg-ink text-cream">
                    <div className="flex items-center justify-between px-3 py-1.5 font-mono text-[9px] uppercase tracking-wide text-cream/60">
                      <span>⚔️ Prévia do combate</span>
                      <span className="flex items-center gap-1">
                        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-blood" />
                        ao vivo
                      </span>
                    </div>
                    {aboveRow && (
                      <CombatRow
                        rank={myRank - 1}
                        handle={aboveRow.handle}
                        amount={aboveRow.amountCents}
                      />
                    )}
                    <CombatRow
                      rank={myRank}
                      handle={handleLower || "você"}
                      amount={chosenCents}
                      me
                    />
                    {sunkRow && (
                      <CombatRow
                        rank={myRank + 1}
                        handle={sunkRow.handle}
                        amount={sunkRow.amountCents}
                        sunk
                      />
                    )}
                  </div>
                )}
                {validBid && (
                  <p className="mt-2 text-[11px] font-semibold text-[color:var(--color-flame)]">
                    {myRank === 1
                      ? `Com ${formatBRL(chosenCents)} você vira o #1 👑`
                      : sunkRow
                      ? `Você entra no #${myRank} e afunda @${sunkRow.handle} 🔥`
                      : `Você entra no #${myRank}.`}
                  </p>
                )}
              </Field>
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-blood bg-blood/10 px-3 py-2 text-sm text-blood">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="btn-hard mt-4 w-full rounded-xl bg-blood py-3 text-lg font-bold text-cream disabled:opacity-60"
            >
              {submitting
                ? "Gerando pagamento…"
                : `Pagar ${formatBRL(chosenCents || 0)}`}
            </button>
          </>
        )}

        {/* ── CHECKOUT ── */}
        {stage === "checkout" && bid && (
          <div className="text-center">
            <div className="flex items-start justify-between">
              <h3 className="font-marker text-2xl">
                {bid.mode === "redirect" ? "Finalize o pagamento" : "Pague com Pix"}
              </h3>
              <button
                onClick={onClose}
                className="text-2xl leading-none text-[color:var(--color-ink-soft)]"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-3xl font-mono font-semibold">
              {formatBRL(bid.amountCents)}
            </p>

            {/* Modo QR (sandbox / Mercado Pago) */}
            {bid.mode === "pix_qr" && (
              <>
                {bid.pixQr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bid.pixQr}
                    alt="QR Pix"
                    className="card-hard mx-auto mt-4 h-56 w-56 rounded-xl bg-cream"
                  />
                )}
                {bid.pixCode && (
                  <button
                    onClick={copyCode}
                    className="btn-hard mx-auto mt-4 flex max-w-full items-center gap-2 rounded-lg bg-cream-200 px-3 py-2 font-mono text-xs"
                  >
                    <span className="max-w-[220px] truncate">{bid.pixCode}</span>
                    <span className="shrink-0 font-bold">
                      {copied ? "copiado!" : "copiar"}
                    </span>
                  </button>
                )}
                {bid.provider === "sandbox" && (
                  <button
                    onClick={simulatePayment}
                    className="btn-hard mt-4 w-full rounded-xl bg-mint py-3 font-bold text-ink"
                  >
                    🧪 Simular pagamento (demo)
                  </button>
                )}
              </>
            )}

            {/* Modo redirect (Hotmart) */}
            {bid.mode === "redirect" && (
              <>
                <p className="mt-4 text-sm text-[color:var(--color-ink-soft)]">
                  Abrimos o checkout do Hotmart numa nova aba. Pague por lá (Pix,
                  cartão ou boleto) e volte aqui — seu lance sobe sozinho.
                </p>
                {bid.checkoutUrl && (
                  <a
                    href={bid.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-hard mt-4 block w-full rounded-xl bg-blood py-3 font-bold text-cream"
                  >
                    Abrir checkout do Hotmart ↗
                  </a>
                )}
              </>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-[color:var(--color-ink-soft)]">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-mint" />
              aguardando pagamento…
            </div>
            <p className="mt-2 text-[11px] text-[color:var(--color-ink-soft)]">
              {bid.provider === "sandbox"
                ? "Modo demo: nenhum dinheiro real é cobrado."
                : "A confirmação chega automaticamente pelo provedor."}
            </p>
          </div>
        )}

        {/* ── PAID ── */}
        {stage === "paid" && (
          <div className="py-10 text-center">
            <p className="text-6xl">👑</p>
            <h3 className="mt-4 font-marker text-3xl">Você subiu!</h3>
            <p className="mt-2 text-[color:var(--color-ink-soft)]">
              Seu lance entrou no ranking. Boa sorte segurando a posição.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 2px solid var(--color-line);
          border-radius: 0.6rem;
          background: var(--color-cream);
          padding: 0.5rem 0.7rem;
          font-size: 0.95rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: var(--color-ink);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-[color:var(--color-ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function CombatRow({
  rank,
  handle,
  amount,
  me,
  sunk,
}: {
  rank: number;
  handle: string;
  amount: number;
  me?: boolean;
  sunk?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 font-mono text-xs ${
        me
          ? "bg-flame font-bold text-ink"
          : sunk
          ? "text-cream/45 line-through decoration-cream/30"
          : "text-cream/70"
      }`}
    >
      <span className="w-6 shrink-0">#{rank}</span>
      <span className="flex-1 truncate">
        {me ? "você" : `@${handle}`} {sunk && "↓"}
        {me && " ↑"}
      </span>
      <span className="shrink-0">{formatBRL(amount)}</span>
    </div>
  );
}
