// Capa de pagos intercambiable.
// Toda la app habla con esta interfaz; el proveedor real se elige por env.
// Hay dos modos de cobro:
//   - "pix_qr":   generamos un QR Pix propio (sandbox, Mercado Pago)
//   - "redirect": mandamos al usuario al checkout hospedado del proveedor
//                 (Hotmart y otros Merchant of Record)

export interface CreateChargeInput {
  bidId: string;
  amountCents: number;
  description: string;
  payerName?: string;
}

export interface Charge {
  providerRef: string; // id de la transacción en el proveedor (o el bidId)
  mode: "pix_qr" | "redirect";
  // modo pix_qr
  pixQr?: string; // dataURL de imagen QR
  pixCode?: string; // Pix copia-e-cola
  // modo redirect
  checkoutUrl?: string; // URL del checkout hospedado (con el bidId embebido)
  expiresAt: Date;
}

export interface PaymentProvider {
  name: string;
  kind: "qr" | "redirect";
  createCharge(input: CreateChargeInput): Promise<Charge>;
  // Verifica el estado consultando al proveedor (polling/fallback).
  isPaid(providerRef: string): Promise<boolean>;
}

import { sandboxProvider } from "./sandbox";
import { mercadoPagoProvider } from "./mercadopago";
import { hotmartProvider } from "./hotmart";
import { infinitePayProvider } from "./infinitepay";

export function getPaymentProvider(): PaymentProvider {
  const p = (process.env.PAYMENT_PROVIDER || "sandbox").toLowerCase();
  switch (p) {
    case "sandbox":
      return sandboxProvider;
    case "infinitepay":
      return infinitePayProvider; // ver ./infinitepay.ts (Pix, montos dinámicos)
    case "mercadopago":
      return mercadoPagoProvider; // ver ./mercadopago.ts
    case "hotmart":
      return hotmartProvider; // ver ./hotmart.ts (Merchant of Record, sin CNPJ)
    // case "dlocal":
    //   return dlocalProvider;    // ver ./dlocal.ts
    default:
      return sandboxProvider;
  }
}
