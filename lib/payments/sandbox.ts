import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { RULES } from "@/lib/site";
import type { PaymentProvider, CreateChargeInput, Charge } from "./index";

// Proveedor de PRUEBA: simula un cobro Pix real sin credenciales.
// Genera un QR y un código copia-e-cola falsos pero con formato plausible.
// La confirmación ocurre vía /api/payments/confirm (botón "simular pago")
// o automáticamente por SANDBOX_AUTO_CONFIRM_SECS (ver el worker en la ruta).

export const sandboxProvider: PaymentProvider = {
  name: "sandbox",
  kind: "qr",

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const providerRef = "sbx_" + nanoid(16);
    // Payload "BR Code" simulado (no es un Pix válido de banco, solo demo).
    const pixCode = buildFakePixPayload(input.amountCents, providerRef);
    const pixQr = await QRCode.toDataURL(pixCode, {
      margin: 1,
      width: 320,
      color: { dark: "#1C1915", light: "#FAF6F1" },
    });
    const expiresAt = new Date(Date.now() + RULES.pixExpiryMins * 60_000);
    return { providerRef, mode: "pix_qr", pixQr, pixCode, expiresAt };
  },

  async isPaid(): Promise<boolean> {
    // En sandbox el estado lo maneja la DB (confirmación manual/auto),
    // así que este método no se consulta. Devuelve false por seguridad.
    return false;
  },
};

function buildFakePixPayload(amountCents: number, ref: string): string {
  const amount = (amountCents / 100).toFixed(2);
  // Estructura tipo EMV/BR Code, suficiente para verse real en la demo.
  return [
    "00020126",
    "580014BR.GOV.BCB.PIX",
    "0136demo@lancetop.com",
    "52040000",
    "5303986",
    `54${String(amount.length).padStart(2, "0")}${amount}`,
    "5802BR",
    "5909LANCETOP",
    "6009SAO PAULO",
    `62${String(ref.length + 4).padStart(2, "0")}05${String(ref.length).padStart(2, "0")}${ref}`,
    "6304DEMO",
  ].join("");
}
