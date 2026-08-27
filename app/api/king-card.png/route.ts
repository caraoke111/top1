import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarTarjetaPNG } from "@/lib/king-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Imagen del #1 ACTUAL, generada solo con datos reales de la base.
// Pública (como una imagen OG), pero NO acepta parámetros: nadie puede
// inyectar nombres/montos falsos. Solo muestra al líder real.
export async function GET() {
  const rey = await prisma.creator.findFirst({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
  });
  if (!rey) return new NextResponse("sem ranking", { status: 404 });

  const png = await generarTarjetaPNG({
    handle: rey.handle,
    name: rey.name,
    amountCents: rey.currentAmountCents,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=30",
    },
  });
}
