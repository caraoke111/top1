import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RULES } from "@/lib/site";

export const runtime = "nodejs";

const schema = z.object({ sessionId: z.string().min(6).max(64) });

// Heartbeat de presencia: cada visitante hace ping cada ~15s.
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
  }

  await prisma.presence.upsert({
    where: { id: parsed.data.sessionId },
    create: { id: parsed.data.sessionId, lastSeen: new Date() },
    update: { lastSeen: new Date() },
  });

  // Limpieza oportunista de sesiones viejas
  const cutoff = new Date(Date.now() - RULES.presenceWindowSecs * 4 * 1000);
  await prisma.presence.deleteMany({ where: { lastSeen: { lt: cutoff } } });

  const since = new Date(Date.now() - RULES.presenceWindowSecs * 1000);
  const liveCount = await prisma.presence.count({
    where: { lastSeen: { gte: since } },
  });

  return NextResponse.json({ liveCount });
}
