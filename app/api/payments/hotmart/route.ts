import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { applyPaidBid } from "@/lib/bids";

export const runtime = "nodejs";

// Webhook de Hotmart. Hotmart llama acá cuando una compra es aprobada.
// Configurá la URL en: Hotmart → Ferramentas → Webhook (API e Notificações):
//   https://tu-dominio/api/payments/hotmart   (evento: Compra aprovada)
// y poné el token en .env: HOTMART_HOTTOK
//
// Docs: https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(obj: any, path: string[]): any {
  return path.reduce((o, k) => (o == null ? o : o[k]), obj);
}

export async function POST(req: Request) {
  const raw = await req.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // ── Regla 1: verificar el hottok (que venga de Hotmart) ──────
  const expected = process.env.HOTMART_HOTTOK;
  if (expected) {
    const received =
      req.headers.get("x-hotmart-hottok") || body?.hottok || "";
    const a = Buffer.from(String(received));
    const b = Buffer.from(expected);
    const ok =
      a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      return NextResponse.json({ error: "hottok inválido" }, { status: 401 });
    }
  }

  // ── Solo compras aprobadas ───────────────────────────────────
  const event = body?.event || body?.data?.purchase?.status || "";
  const status = pick(body, ["data", "purchase", "status"]) || "";
  const approved =
    event === "PURCHASE_APPROVED" ||
    status === "APPROVED" ||
    status === "COMPLETE";
  if (!approved) {
    return NextResponse.json({ ignored: true, event, status });
  }

  // ── Identificar el lance por el sck ──────────────────────────
  const sck =
    pick(body, ["data", "purchase", "origin", "sck"]) ||
    pick(body, ["data", "purchase", "tracking", "source_sck"]) ||
    "";
  if (!sck) {
    return NextResponse.json({ error: "sem sck (bidId)" }, { status: 400 });
  }

  const bid = await prisma.bid.findUnique({ where: { id: String(sck) } });
  if (!bid) {
    return NextResponse.json({ error: "lance não encontrado" }, { status: 404 });
  }

  // ── Regla 2: verificar el monto ──────────────────────────────
  const priceValue = Number(pick(body, ["data", "purchase", "price", "value"]));
  const paidCents = Math.round((isNaN(priceValue) ? 0 : priceValue) * 100);
  if (paidCents < bid.amountCents) {
    await prisma.bid.update({
      where: { id: bid.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: "monto insuficiente" }, { status: 400 });
  }

  // Guardar la transacción real de Hotmart y aplicar el lance
  const transaction = pick(body, ["data", "purchase", "transaction"]) || "";
  await prisma.bid.update({
    where: { id: bid.id },
    data: { providerRef: String(transaction || sck) },
  });
  await applyPaidBid(bid.id);

  return NextResponse.json({ status: "paid" });
}
