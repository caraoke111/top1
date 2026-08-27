import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarReinado } from "@/lib/content-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tarjeta "reinado": el #1 actual y hace cuánto está en el topo (datos reales).
export async function GET() {
  const rey = await prisma.creator.findFirst({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
  });
  if (!rey) return new NextResponse("sem ranking", { status: 404 });
  const horas = rey.reignStartedAt
    ? Math.max(0, Math.floor((Date.now() - rey.reignStartedAt.getTime()) / 3600000))
    : 0;
  const png = await generarReinado({
    handle: rey.handle,
    name: rey.name,
    amountCents: rey.currentAmountCents,
    horas,
  });
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
  });
}
