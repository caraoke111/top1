import { NextResponse } from "next/server";
import { getRanking, getWidgets } from "@/lib/bids";
import { prisma } from "@/lib/prisma";
import { RULES } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const since = new Date(Date.now() - RULES.presenceWindowSecs * 1000);
  const [ranking, widgets, liveCount] = await Promise.all([
    getRanking(),
    getWidgets(),
    prisma.presence.count({ where: { lastSeen: { gte: since } } }),
  ]);

  return NextResponse.json(
    { ranking, widgets, liveCount },
    { headers: { "Cache-Control": "no-store" } }
  );
}
