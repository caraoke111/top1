import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { applyPaidBid } from "@/lib/bids";
import { infinitePayVerify } from "@/lib/payments/infinitepay";

export const runtime = "nodejs";

// Webhook de InfinitePay. Como la doc no define firma, la seguridad es en capas:
//   1. Un SECRETO en la URL (solo vos e InfinitePay lo conocen).
//   2. Verificación server-to-server con /payment_check (fuente de verdad).
//   3. El monto pagado debe cubrir el lance.
//   4. Idempotencia: cada lance se aplica una sola vez.
//
// Configurá webhook_url = https://tu-dominio/api/payments/infinitepay/<SECRET>
// (la app ya lo arma sola con INFINITEPAY_WEBHOOK_SECRET).

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;

  // ── Capa 1: secreto en la URL ────────────────────────────────
  const expected = process.env.INFINITEPAY_WEBHOOK_SECRET || "";
  const a = Buffer.from(secret || "");
  const b = Buffer.from(expected);
  const secretOk =
    expected.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(a, b);
  if (!secretOk) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const orderNsu = String(body?.order_nsu || "");
  const transactionNsu = body?.transaction_nsu
    ? String(body.transaction_nsu)
    : undefined;
  const slug = body?.invoice_slug || body?.slug || undefined;

  if (!orderNsu) {
    return NextResponse.json({ error: "sem order_nsu" }, { status: 400 });
  }

  const bid = await prisma.bid.findUnique({ where: { id: orderNsu } });
  if (!bid) {
    return NextResponse.json({ error: "lance não encontrado" }, { status: 404 });
  }
  if (bid.status === "paid") {
    return NextResponse.json({ status: "paid" }); // idempotente
  }

  // ── Capa 2: verificación real contra InfinitePay ─────────────
  const check = await infinitePayVerify({
    orderNsu,
    transactionNsu,
    slug: slug ? String(slug) : undefined,
  });
  if (!check || !check.paid) {
    // Aún no confirmado (posible desfase). Respondemos 400 para que
    // InfinitePay REINTENTE el webhook y demos tiempo a que se confirme.
    return NextResponse.json({ status: "not_paid_retry" }, { status: 400 });
  }

  // ── Capa 3: el monto debe cubrir el lance ────────────────────
  if (check.paidAmountCents < bid.amountCents) {
    await prisma.bid.update({
      where: { id: bid.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: "monto insuficiente" }, { status: 400 });
  }

  await prisma.bid.update({
    where: { id: bid.id },
    data: { providerRef: transactionNsu || orderNsu },
  });
  await applyPaidBid(bid.id);

  return NextResponse.json({ status: "paid" });
}
