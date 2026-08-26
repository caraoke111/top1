"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SITE, T, formatBRL } from "@/lib/site";
import type { RankingResponse, RankRow } from "@/lib/types";
import Hero from "@/components/Hero";
import Leaderboard from "@/components/Leaderboard";
import WidgetsBar from "@/components/WidgetsBar";
import BidModal from "@/components/BidModal";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("lt_sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("lt_sid", id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

export default function RankingApp() {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    handle?: string;
    amountCents?: number;
    targetName?: string;
  }>({ open: false });

  const prevTopId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ranking", { cache: "no-store" });
      if (!res.ok) return;
      const json: RankingResponse = await res.json();
      setData(json);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling del ranking
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  // Heartbeat de presencia
  useEffect(() => {
    const sid = getSessionId();
    const ping = () =>
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      }).catch(() => {});
    ping();
    const t = setInterval(ping, 12000);
    return () => clearInterval(t);
  }, []);

  // Detecta cambio de #1 para el flash
  useEffect(() => {
    const top = data?.ranking[0];
    if (top) prevTopId.current = top.id;
  }, [data]);

  const openEnter = () =>
    setModal({ open: true, amountCents: data?.widgets.entryPriceCents });

  const openSteal = (row: RankRow) =>
    setModal({
      open: true,
      amountCents: row.priceToBeatCents,
      targetName: row.name,
    });

  return (
    <main className="min-h-screen">
      <Hero
        liveCount={data?.liveCount ?? 0}
        king={data?.ranking[0] ?? null}
        stats={data?.stats ?? null}
        onEnter={openEnter}
      />

      <div className="mx-auto max-w-3xl px-4 pb-24">
        <WidgetsBar widgets={data?.widgets ?? null} />

        <div className="mt-8 mb-3 flex items-center justify-between">
          <h2 className="font-marker text-2xl">👑 {T.ranking}</h2>
          <button
            onClick={load}
            className="font-mono text-xs text-[color:var(--color-ink-soft)] hover:text-ink"
          >
            ⟳ {T.refresh}
          </button>
        </div>

        <Leaderboard
          rows={data?.ranking ?? []}
          loading={loading}
          onSteal={openSteal}
          highlightId={prevTopId.current}
        />

        {data && data.ranking.length > 0 && (
          <p className="mt-6 text-center font-mono text-sm text-[color:var(--color-ink-soft)]">
            {T.endOfRanking}
            <br />
            <span className="text-ink">
              {T.costHint(
                data.ranking.length,
                formatBRL(data.widgets.entryPriceCents)
              )}{" "}
              🔥
            </span>
          </p>
        )}

        <button
          onClick={openEnter}
          className="btn-hard mt-8 w-full rounded-xl bg-ink px-6 py-4 text-lg font-bold text-cream"
        >
          {T.ctaEnter}
        </button>
        <p className="mt-3 text-center text-sm text-[color:var(--color-ink-soft)]">
          {T.alreadyIn}
        </p>

        <footer className="mt-16 border-t-2 border-dashed border-line pt-6 text-center">
          <p className="text-sm text-[color:var(--color-ink-soft)]">{T.footer}</p>
          <p className="mt-2 font-marker text-lg">
            {SITE.name} — {SITE.tagline}.
          </p>
          <p className="mt-4 flex items-center justify-center gap-3 font-mono text-xs text-[color:var(--color-ink-soft)]">
            <a href="/privacidade" className="hover:text-ink hover:underline">
              Privacidade
            </a>
            <span>·</span>
            <a href="/cookies" className="hover:text-ink hover:underline">
              Cookies
            </a>
          </p>
        </footer>
      </div>

      {modal.open && (
        <BidModal
          initialHandle={modal.handle}
          initialAmountCents={modal.amountCents}
          targetName={modal.targetName}
          ranking={data?.ranking ?? []}
          onClose={() => setModal({ open: false })}
          onPaid={() => {
            setModal({ open: false });
            load();
          }}
        />
      )}
    </main>
  );
}
