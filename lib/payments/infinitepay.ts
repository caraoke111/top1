import type { PaymentProvider, CreateChargeInput, Charge } from "./index";
import { RULES } from "@/lib/site";

// Proveedor InfinitePay (CloudWalk) — pasarela real con Pix y montos dinámicos.
// El usuario ya tiene cuenta activa en Brasil. Cobra a cualquier valor.
//
// Requiere en .env:
//   PAYMENT_PROVIDER="infinitepay"
//   INFINITEPAY_HANDLE="tu-infinitetag"        (sin el $)
//   INFINITEPAY_WEBHOOK_SECRET="algo-secreto"  (protege la URL del webhook)
//   INFINITEPAY_API_KEY="..."                  (opcional, si tu cuenta lo exige)
//   NEXT_PUBLIC_BASE_URL="https://tu-dominio"
//
// Docs: https://www.infinitepay.io/checkout-documentacao

const LINKS_URL = "https://api.checkout.infinitepay.io/links";
const CHECK_URL = "https://api.checkout.infinitepay.io/payment_check";

function handle(): string {
  const h = process.env.INFINITEPAY_HANDLE;
  if (!h) throw new Error("Falta INFINITEPAY_HANDLE en .env");
  return h.replace(/^\$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.INFINITEPAY_API_KEY;
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (key) base["Authorization"] = `Bearer ${key}`;
  return base;
}

export const infinitePayProvider: PaymentProvider = {
  name: "infinitepay",
  kind: "redirect",

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "";
    const secret = process.env.INFINITEPAY_WEBHOOK_SECRET || "semsegredo";

    const res = await fetch(LINKS_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        handle: handle(),
        // order_nsu = nuestro bidId; vuelve en el webhook para identificar el lance
        order_nsu: input.bidId,
        items: [
          {
            quantity: 1,
            price: input.amountCents, // en centavos, monto dinámico
            description: input.description,
          },
        ],
        webhook_url: base
          ? `${base}/api/payments/infinitepay/${secret}`
          : undefined,
        redirect_url: base ? `${base}/obrigado` : undefined,
      }),
    });

    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      /* respuesta no-JSON */
    }
    if (!res.ok) {
      throw new Error(
        `InfinitePay error ${res.status}: ${data?.message || text.slice(0, 120)}`
      );
    }

    // El nombre del campo del link puede variar; probamos los más comunes.
    const checkoutUrl: string =
      data?.url ||
      data?.link ||
      data?.payment_url ||
      data?.checkout_url ||
      data?.data?.url ||
      (typeof data === "string" ? data : "");

    if (!checkoutUrl) {
      throw new Error(
        `InfinitePay: no encontré la URL del link en la respuesta. Campos: ${Object.keys(
          data || {}
        ).join(", ")}`
      );
    }

    return {
      providerRef: input.bidId, // aún no hay transaction_nsu; lo guarda el webhook
      mode: "redirect",
      checkoutUrl,
      expiresAt: new Date(Date.now() + RULES.pixExpiryMins * 60_000),
    };
  },

  async isPaid(): Promise<boolean> {
    // La confirmación llega por webhook (verificada con /payment_check).
    return false;
  },
};

// Verificación server-to-server: confirma que un pago es real y cuánto se pagó.
// Se usa desde el webhook para NO confiar en la notificación a ciegas.
export async function infinitePayVerify(params: {
  orderNsu: string;
  transactionNsu?: string;
  slug?: string;
}): Promise<{ paid: boolean; paidAmountCents: number } | null> {
  try {
    const res = await fetch(CHECK_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        handle: handle(),
        order_nsu: params.orderNsu,
        transaction_nsu: params.transactionNsu,
        slug: params.slug,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      paid: data?.paid === true && data?.success !== false,
      paidAmountCents: Math.round(Number(data?.paid_amount ?? data?.amount ?? 0)),
    };
  } catch {
    return null;
  }
}
