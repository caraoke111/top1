import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPaidBid } from "@/lib/bids";

export const runtime = "nodejs";

// Confirmación de pago.
// - SANDBOX: la llama el botón "Simular pagamento" del checkout.
// - REAL: apuntá acá (o a /api/payments/webhook) el webhook del proveedor
//   tras validar la firma, y resolvé el bidId desde providerRef.
const schema = z.object({ bidId: z.string().min(1) });

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bidId requerido" }, { status: 400 });
  }

  // NOTA: en producción, este endpoint debe verificar el origen (webhook
  // firmado). Para la demo sandbox confirmamos directamente.
  await applyPaidBid(parsed.data.bidId);
  return NextResponse.json({ status: "paid" });
}
