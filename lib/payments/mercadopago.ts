import { nanoid } from "nanoid";
import type { PaymentProvider, CreateChargeInput, Charge } from "./index";

// Proveedor REAL: Mercado Pago (Pix).
// Funciona en modo TEST sin CNPJ usando un access token de prueba
// (https://www.mercadopago.com.br/developers → Suas integrações → credenciais
// de teste). Para producción, cambiá por el access token de producción.
//
// Requiere en .env:
//   PAYMENT_PROVIDER="mercadopago"
//   MERCADOPAGO_ACCESS_TOKEN="TEST-xxxx"   (o APP_USR-xxxx en prod)
//   NEXT_PUBLIC_BASE_URL="https://tu-dominio"  (para la URL del webhook)

const API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en .env");
  return t;
}

export const mercadoPagoProvider: PaymentProvider = {
  name: "mercadopago",
  kind: "qr",

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "";
    const res = await fetch(`${API}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
        // Evita cobros duplicados si el request se reintenta
        "X-Idempotency-Key": input.bidId + "-" + nanoid(8),
      },
      body: JSON.stringify({
        transaction_amount: Number((input.amountCents / 100).toFixed(2)),
        description: input.description,
        payment_method_id: "pix",
        // El webhook recibirá este id; lo usamos para ubicar el Bid
        external_reference: input.bidId,
        notification_url: base ? `${base}/api/payments/webhook` : undefined,
        payer: {
          email: `bid_${input.bidId}@lancetop.demo`,
          first_name: input.payerName || "Criador",
        },
        date_of_expiration: new Date(Date.now() + 15 * 60_000).toISOString(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Mercado Pago error ${res.status}: ${data?.message || "desconhecido"}`
      );
    }

    const tx = data?.point_of_interaction?.transaction_data;
    const qrBase64: string | undefined = tx?.qr_code_base64;
    return {
      providerRef: String(data.id),
      mode: "pix_qr",
      pixQr: qrBase64 ? `data:image/png;base64,${qrBase64}` : "",
      pixCode: tx?.qr_code || "",
      expiresAt: data?.date_of_expiration
        ? new Date(data.date_of_expiration)
        : new Date(Date.now() + 15 * 60_000),
    };
  },

  async isPaid(providerRef: string): Promise<boolean> {
    const res = await fetch(`${API}/v1/payments/${providerRef}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "approved";
  },
};

// Consulta el estado + el monto real pagado de un pago MP (usado por el webhook).
export async function getMercadoPagoPayment(
  paymentId: string
): Promise<{ status: string; amountCents: number; externalReference: string } | null> {
  const res = await fetch(`${API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    status: data?.status ?? "unknown",
    amountCents: Math.round((data?.transaction_amount ?? 0) * 100),
    externalReference: data?.external_reference ?? "",
  };
}
