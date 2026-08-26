import type { PaymentProvider, CreateChargeInput, Charge } from "./index";
import { hotmartOfferUrl } from "./hotmart.offers";
import { RULES } from "@/lib/site";

// Proveedor Hotmart (Merchant of Record). No genera QR: redirige al checkout
// hospedado de Hotmart, que maneja Pix/tarjeta/boleto, KYC e impuestos.
// Ideal cuando NO tenés CNPJ (Hotmart acepta productor persona física / CPF).
//
// El monto NO es libre: cada nivel (TIERS_CENTS) = una oferta creada en Hotmart,
// con su link en lib/payments/hotmart.offers.ts.
//
// Requiere en .env:
//   PAYMENT_PROVIDER="hotmart"
//   HOTMART_HOTTOK="..."   (para verificar el webhook; panel → Ferramentas → Webhook)

export const hotmartProvider: PaymentProvider = {
  name: "hotmart",
  kind: "redirect",

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const base = hotmartOfferUrl(input.amountCents);
    if (!base) {
      throw new Error(
        `Nível R$${(input.amountCents / 100).toFixed(
          2
        )} sem link de Hotmart configurado (lib/payments/hotmart.offers.ts).`
      );
    }
    // El bidId viaja como sck y vuelve en el webhook para identificar el lance.
    const sep = base.includes("?") ? "&" : "?";
    const checkoutUrl = `${base}${sep}sck=${encodeURIComponent(input.bidId)}`;

    return {
      providerRef: input.bidId, // Hotmart no da un id antes del pago; usamos el sck
      mode: "redirect",
      checkoutUrl,
      expiresAt: new Date(Date.now() + RULES.pixExpiryMins * 60_000),
    };
  },

  async isPaid(): Promise<boolean> {
    // Hotmart no expone una consulta simple por sck; la confirmación llega por
    // webhook (PURCHASE_APPROVED). El polling del cliente solo mira la DB.
    return false;
  },
};
