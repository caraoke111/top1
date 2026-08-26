"use client";

import { useEffect, useRef, useState } from "react";
import { RULES, formatBRL } from "@/lib/site";

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
  onClose,
  onPaid,
}: {
  initialHandle?: string;
  initialAmountCents?: number;
  targetName?: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  // Monto mínimo para este lance (superar al rival, o el mínimo de entrada)
  const minCents = Math.max(initialAmountCents ?? RULES.minEntryCents, RULES.minEntryCents);

  const [stage, setStage] = useState<Stage>("form");
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [country, setCountry] = useState("🇧🇷");
  const [category, setCategory] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [reais, setReais] = useState<string>((minCents / 100).toFixed(2));
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
              <Field label="@ do criador *">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="seuusuario"
                  className="input"
                  autoFocus
                />
              </Field>
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

              {/* Monto libre */}
              <Field label="Seu lance (R$) *">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-lg text-[color:var(--color-ink-soft)]">
                    R$
                  </span>
                  <input
                    value={reais}
                    onChange={(e) =>
                      setReais(e.target.value.replace(/[^0-9.,]/g, ""))
                    }
                    inputMode="decimal"
                    className="input pl-10 font-mono text-xl font-semibold"
                  />
                </div>
                {/* Atajos rápidos */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[minCents, minCents + 100, minCents + 500, minCents + 2000].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setReais((c / 100).toFixed(2))}
                        className="rounded-md border border-line px-2 py-1 font-mono text-xs hover:bg-cream-200"
                      >
                        {formatBRL(c)}
                      </button>
                    )
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]">
                  {targetName
                    ? `Para passar ${targetName}, mínimo ${formatBRL(minCents)}.`
                    : `Lance mínimo: ${formatBRL(minCents)}.`}
                </p>
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
