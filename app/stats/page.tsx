"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/site";
import type { RankingResponse } from "@/lib/types";

export default function StatsPage() {
  const [data, setData] = useState<RankingResponse | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/ranking", { cache: "no-store" })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const s = data?.stats;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="font-mono text-xs text-[color:var(--color-ink-soft)] hover:text-ink"
      >
        ← Voltar ao ranking
      </Link>

      <h1 className="mt-4 font-marker text-4xl">📊 Estatísticas</h1>
      <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
        Ao vivo — atualiza a cada 5 segundos.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile emoji="💰" label="Total no ranking" value={formatBRL(s?.totalRaisedCents ?? 0)} />
        <Tile emoji="🔥" label="Pujado hoje" value={formatBRL(s?.bidTodayCents ?? 0)} />
        <Tile emoji="👑" label="Criadores" value={String(s?.creators ?? 0)} />
        <Tile emoji="👆" label="Cliques enviados" value={(s?.totalClicks ?? 0).toLocaleString("pt-BR")} />
        <Tile emoji="👀" label="Online agora" value={String(data?.liveCount ?? 0)} />
      </div>

      {data && data.ranking.length > 0 && (
        <>
          <h2 className="mt-12 font-marker text-2xl">Top 5</h2>
          <ul className="mt-3 space-y-2">
            {data.ranking.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="card-hard flex items-center gap-3 rounded-xl bg-cream px-4 py-3"
              >
                <span className="w-6 font-mono text-lg font-semibold text-[color:var(--color-ink-soft)]">
                  {r.rank === 1 ? "⚡1" : r.rank}
                </span>
                <a
                  href={r.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-semibold hover:text-violet hover:underline"
                >
                  @{r.handle}
                </a>
                <span className="shrink-0 font-mono font-semibold">
                  {formatBRL(r.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="btn-hard inline-block rounded-xl bg-blood px-8 py-3 font-bold text-cream"
        >
          Entrar no ranking →
        </Link>
      </div>
    </main>
  );
}

function Tile({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="card-hard rounded-xl bg-cream-200 p-4">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}
