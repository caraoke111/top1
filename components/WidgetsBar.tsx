"use client";

import { T, formatBRL } from "@/lib/site";
import type { Widgets } from "@/lib/types";

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function Card({
  emoji,
  label,
  value,
  who,
}: {
  emoji: string;
  label: string;
  value: string;
  who: string;
}) {
  return (
    <div className="card-hard flex-1 rounded-xl bg-cream-200 p-3">
      <p className="text-lg">{emoji}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[color:var(--color-ink-soft)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
      <p className="truncate text-xs text-[color:var(--color-ink-soft)]">{who}</p>
    </div>
  );
}

export default function WidgetsBar({ widgets }: { widgets: Widgets | null }) {
  if (!widgets) return null;
  const { mostClicked24h, longestReign, biggestEgo } = widgets;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Card
        emoji="🔥"
        label={T.widgetMostClicked}
        value={mostClicked24h ? String(mostClicked24h.clicks) : "—"}
        who={mostClicked24h ? `@${mostClicked24h.handle}` : "—"}
      />
      <Card
        emoji="🕐"
        label={T.widgetLongestReign}
        value={longestReign ? fmtDuration(longestReign.secs) : "—"}
        who={longestReign ? `@${longestReign.handle}` : "—"}
      />
      <Card
        emoji="😎"
        label={T.widgetBiggestEgo}
        value={biggestEgo ? formatBRL(biggestEgo.amountCents) : "—"}
        who={biggestEgo ? `@${biggestEgo.handle}` : "—"}
      />
    </div>
  );
}
