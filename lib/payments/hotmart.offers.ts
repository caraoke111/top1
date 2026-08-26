// ┌─────────────────────────────────────────────────────────────┐
// │  LINKS DE CHECKOUT DE HOTMART — PEGÁ ACÁ LOS REALES           │
// └─────────────────────────────────────────────────────────────┘
//
// En Hotmart creá 1 producto "Impulso de perfil" (servicio digital) y 8
// OFERTAS con estos precios fijos (una por nivel). Copiá el link de checkout
// de cada oferta (Produto → Ofertas → link de compra) y pegalo abajo.
//
// El nivel es la CLAVE (en centavos de R$) y el valor es el link.
// La app le agrega ?sck=<bidId> automáticamente para rastrear qué lance se pagó.

export const HOTMART_OFFERS: Record<number, string> = {
  500: "https://pay.hotmart.com/XXXXXXXXX?off=oferta5",     // R$5
  1000: "https://pay.hotmart.com/XXXXXXXXX?off=oferta10",   // R$10
  2500: "https://pay.hotmart.com/XXXXXXXXX?off=oferta25",   // R$25
  5000: "https://pay.hotmart.com/XXXXXXXXX?off=oferta50",   // R$50
  10000: "https://pay.hotmart.com/XXXXXXXXX?off=oferta100", // R$100
  25000: "https://pay.hotmart.com/XXXXXXXXX?off=oferta250", // R$250
  50000: "https://pay.hotmart.com/XXXXXXXXX?off=oferta500", // R$500
  100000: "https://pay.hotmart.com/XXXXXXXXX?off=oferta1000", // R$1000
};

// ¿Está configurado un nivel? (link real, no placeholder)
export function hotmartOfferUrl(tierCents: number): string | null {
  const url = HOTMART_OFFERS[tierCents];
  if (!url || url.includes("XXXXXXXXX")) return null;
  return url;
}
