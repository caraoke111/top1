import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { applyPaidBid } from "@/lib/bids";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";

export const runtime = "nodejs";

// Webhook de Mercado Pago. MP llama acá cuando cambia el estado de un pago.
// Seguridad: verifica la firma HMAC y el monto real antes de aplicar el lance.
//
// Configurá la URL en MP → Suas integrações → Webhooks:
//   https://tu-dominio/api/payments/webhook   (evento: Pagamentos)
// y poné el secreto en .env: MERCADOPAGO_WEBHOOK_SECRET

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawBody = await req.text();

  // data.id puede venir en el body o en la query
  let dataId = url.searchParams.get("data.id") || "";
  let type = url.searchParams.get("type") || "";
  try {
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    dataId = dataId || String(parsed?.data?.id || "");
    type = type || String(parsed?.type || parsed?.action || "");
  } catch {
    /* body puede venir vacío */
  }

  // ── Regla 1: verificar la firma ──────────────────────────────
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";
    const parts = Object.fromEntries(
      xSignature.split(",").map((kv) => {
        const [k, v] = kv.split("=");
        return [k?.trim(), v?.trim()];
      })
    );
    const ts = parts["ts"];
    const v1 = parts["v1"];
    // Manifest exacto que exige MP:
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    const ok =
      !!v1 &&
      v1.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));

    if (!ok) {
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }
  }

  // Solo nos interesan los eventos de pago
  if (!dataId || !type.includes("payment")) {
    return NextResponse.json({ ignored: true });
  }

  // ── Consultar el pago real en MP (fuente de verdad) ──────────
  const payment = await getMercadoPagoPayment(dataId);
  if (!payment) {
    return NextResponse.json({ error: "pago no encontrado" }, { status: 404 });
  }
  if (payment.status !== "approved") {
    return NextResponse.json({ status: payment.status });
  }

  // Ubicar el Bid por providerRef (o external_reference como respaldo)
  const bid =
    (await prisma.bid.findFirst({ where: { providerRef: String(dataId) } })) ||
    (payment.externalReference
      ? await prisma.bid.findUnique({ where: { id: payment.externalReference } })
      : null);

  if (!bid) {
    return NextResponse.json({ error: "lance no encontrado" }, { status: 404 });
  }

  // ── Regla 2: verificar el monto ──────────────────────────────
  if (payment.amountCents < bid.amountCents) {
    await prisma.bid.update({
      where: { id: bid.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: "monto insuficiente" }, { status: 400 });
  }

  await applyPaidBid(bid.id);
  return NextResponse.json({ status: "paid" });
}
