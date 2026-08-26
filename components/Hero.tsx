"use client";

import Link from "next/link";
import { SITE, T, formatBRL } from "@/lib/site";
import type { RankRow, Stats } from "@/lib/types";

export default function Hero({
  liveCount,
  king,
  stats,
  onEnter,
}: {
  liveCount: number;
  king: RankRow | null;
  stats: Stats | null;
  onEnter: () => void;
}) {
  return (
    <header className="relative overflow-hidden border-b-2 border-ink">
      {/* barra superior */}
      <div className="flex items-center justify-between px-4 py-3 text-xs font-mono">
        <span className="font-marker text-lg">{SITE.name}</span>
        <span className="flex items-center gap-2">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-blood" />
          {T.live} · {liveCount} {liveCount === 1 ? "olho" : "olhos"}
        </span>
      </div>

      {/* barra de stats */}
      <div className="flex justify-center px-4 pb-2">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border-2 border-ink bg-cream-200 px-4 py-1.5 font-mono text-[11px] text-[color:var(--color-ink-soft)]">
          <span className="flex items-center gap-1.5">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
            <b className="text-ink">{liveCount}</b> online
          </span>
          <span className="opacity-40">·</span>
          <span>
            <b className="text-ink">
              {formatBRL(stats?.bidTodayCents ?? 0)}
            </b>{" "}
            pujado hoje
          </span>
          <span className="opacity-40">·</span>
          <span>
            <b className="text-ink">
              {(stats?.totalClicks ?? 0).toLocaleString("pt-BR")}
            </b>{" "}
            cliques
          </span>
          <span className="opacity-40">·</span>
          <Link href="/stats" className="font-semibold text-flame hover:underline">
            ver stats ↗
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-ink-soft)]">
          {T.eyebrow}
        </p>

        <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
          {T.h1a}
          <br />
          <span className="grad-text font-marker">{T.h1b}</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base text-[color:var(--color-ink-soft)] sm:text-lg">
          {T.sub}
        </p>

        {/* tarjeta del rey */}
        <div className="card-hard mx-auto mt-8 flex max-w-md items-center gap-3 rounded-2xl bg-cream-200 p-3 text-left">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,#f09433,#bc1888)] text-xl">
            {king?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={king.avatarUrl}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              "👑"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase text-[color:var(--color-ink-soft)]">
              O #1 por
            </p>
            <p className="truncate font-bold">
              {king ? (
                <a
                  href={king.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Ver perfil de @${king.handle}`}
                  className="hover:text-violet hover:underline"
                >
                  {king.name}
                </a>
              ) : (
                "ninguém ainda"
              )}
            </p>
          </div>
          <div className="font-mono text-2xl font-semibold">
            {king ? formatBRL(king.amountCents) : formatBRL(0)}
          </div>
        </div>

        <button
          onClick={onEnter}
          className="btn-hard mt-8 rounded-xl bg-blood px-8 py-4 text-lg font-bold text-cream"
        >
          {T.ctaEnter}
        </button>
      </div>
    </header>
  );
}
