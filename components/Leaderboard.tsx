"use client";

import { T, formatBRL } from "@/lib/site";
import type { RankRow } from "@/lib/types";

function rankBadge(rank: number) {
  if (rank === 1) return "⚡1";
  return String(rank);
}

function registerClick(creatorId: string, url: string) {
  fetch("/api/clicks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorId }),
  }).catch(() => {});
  window.open(url, "_blank", "noopener,noreferrer");
}

function Row({
  row,
  onSteal,
}: {
  row: RankRow;
  onSteal: (r: RankRow) => void;
}) {
  const link = row.links[0];
  return (
    <li
      className={`flex items-center gap-3 border-b border-line px-3 py-3 ${
        row.isKing ? "bg-[linear-gradient(90deg,rgba(240,148,51,0.10),transparent)]" : ""
      }`}
    >
      {/* puesto */}
      <div
        className={`w-8 shrink-0 text-center font-mono text-lg font-semibold ${
          row.isKing ? "text-flame" : "text-[color:var(--color-ink-soft)]"
        }`}
      >
        {rankBadge(row.rank)}
      </div>

      {/* avatar */}
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#9b6ee8,#1c1915)] text-sm font-bold text-cream">
        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          row.name.slice(0, 2).toUpperCase()
        )}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 font-semibold leading-tight">
          <span className="truncate">{row.name}</span>
          {row.verified && <span className="text-mint">✔</span>}
          {row.country && <span>{row.country}</span>}
        </p>
        <p className="truncate text-xs text-[color:var(--color-ink-soft)]">
          <a
            href={`https://instagram.com/${row.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ver @${row.handle} no Instagram`}
            className="text-violet hover:underline"
          >
            @{row.handle}
          </a>
          {row.category ? ` · ${row.category}` : ""}
        </p>
        {row.bio && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[color:var(--color-ink-soft)]">
            {row.bio}
          </p>
        )}
        {link && (
          <button
            onClick={() => registerClick(row.id, link.url)}
            className="mt-1 font-mono text-[11px] text-violet hover:underline"
          >
            {T.open} ↗
          </button>
        )}
      </div>

      {/* clics */}
      <div className="hidden w-14 shrink-0 text-right sm:block">
        <p className="font-mono text-sm">{row.clicks}</p>
        <p className="font-mono text-[9px] uppercase text-[color:var(--color-ink-soft)]">
          {T.colClicks}
        </p>
      </div>

      {/* lance + acción */}
      <div className="w-24 shrink-0 text-right">
        <p className="font-mono text-lg font-semibold">
          {formatBRL(row.amountCents)}
        </p>
        <button
          onClick={() => onSteal(row)}
          className="btn-hard mt-1 rounded-lg bg-cream px-2 py-1 text-[11px] font-bold"
          title={`${T.steal} — ${formatBRL(row.priceToBeatCents)}`}
        >
          {T.steal}
        </button>
      </div>
    </li>
  );
}

export default function Leaderboard({
  rows,
  loading,
  onSteal,
}: {
  rows: RankRow[];
  loading: boolean;
  onSteal: (r: RankRow) => void;
  highlightId?: string | null;
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="card-hard rounded-xl bg-cream-200 p-8 text-center font-mono text-sm text-[color:var(--color-ink-soft)]">
        carregando ranking…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card-hard rounded-xl bg-cream-200 p-8 text-center">
        <p className="font-marker text-2xl">Ninguém ousou ainda 👀</p>
        <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
          Seja o primeiro nome no ranking.
        </p>
      </div>
    );
  }

  return (
    <ul className="card-hard overflow-hidden rounded-xl bg-cream">
      {/* encabezado */}
      <li className="flex items-center gap-3 border-b-2 border-ink bg-cream-200 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-ink-soft)]">
        <span className="w-8 text-center">#</span>
        <span className="flex-1">{T.colCreator}</span>
        <span className="hidden w-14 text-right sm:block">{T.colClicks}</span>
        <span className="w-24 text-right">{T.colBid}</span>
      </li>
      {rows.map((row) => (
        <Row key={row.id} row={row} onSteal={onSteal} />
      ))}
    </ul>
  );
}
