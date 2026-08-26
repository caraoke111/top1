import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico temporal (borrar después). Revela por qué falla la DB en prod,
// SIN exponer la contraseña.
export async function GET() {
  const url = process.env.DATABASE_URL || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: any = {
    hasDatabaseUrl: !!url,
    host: url ? url.split("@")[1]?.split("/")[0] || "?" : null,
    provider: process.env.PAYMENT_PROVIDER || null,
  };
  try {
    info.creators = await prisma.creator.count();
    info.dbOk = true;
  } catch (e) {
    info.dbOk = false;
    info.error = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(info);
}
