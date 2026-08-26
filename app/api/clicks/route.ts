import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({ creatorId: z.string().min(1) });

// Registra un clic al link externo de un creador (para "Mais clicado 24h").
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "creatorId requerido" }, { status: 400 });
  }

  const creator = await prisma.creator.findUnique({
    where: { id: parsed.data.creatorId },
  });
  if (!creator) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.clickEvent.create({ data: { creatorId: creator.id } }),
    prisma.creator.update({
      where: { id: creator.id },
      data: { clicks: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
