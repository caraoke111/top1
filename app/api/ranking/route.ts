import { NextResponse } from "next/server";
import { getRanking, getWidgets, getStats } from "@/lib/bids";
import { prisma } from "@/lib/prisma";
import { RULES } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const since = new Date(Date.now() - RULES.presenceWindowSecs * 1000);
  const [ranking, widgets, stats, liveCount] = await Promise.all([
    getRanking(),
    getWidgets(),
    getStats(),
    prisma.presence.count({ where: { lastSeen: { gte: since } } }),
  ]);

  return NextResponse.json(
    { ranking, widgets, stats, liveCount },
    { headers: { "Cache-Control": "no-store" } }
  );
}
