import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarTop5 } from "@/lib/content-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tarjeta "Top 5": los 5 primeros del ranking (datos reales).
export async function GET() {
  const top = await prisma.creator.findMany({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
    take: 5,
  });
  if (!top.length) return new NextResponse("sem ranking", { status: 404 });
  const png = await generarTop5(
    top.map((c, i) => ({ rank: i + 1, handle: c.handle, amountCents: c.currentAmountCents }))
  );
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
  });
}
