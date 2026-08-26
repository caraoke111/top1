// Configuración central de marca, reglas y textos (PT-BR).
// Cambiá SITE.name / SITE.tagline para renombrar todo el sitio.

export const SITE = {
  name: "LanceTop",
  tagline: "o ranking de criadores que o dinheiro decide",
  domain: "lancetop.com",
  currency: "BRL",
  currencySymbol: "R$",
  locale: "pt-BR",
};

// Niveles fijos de lance (centavos de R$). Obligatorio para Hotmart, que vende
// productos con precio fijo: cada nivel = un producto/oferta en Hotmart.
// Escala progresiva: R$5, 10, 25, 50, 100, 250, 500, 1000.
export const TIERS_CENTS = [
  500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
] as const;

// Reglas del juego (en centavos de R$)
export const RULES = {
  minEntryCents: TIERS_CENTS[0], // primer nivel
  maxTierCents: TIERS_CENTS[TIERS_CENTS.length - 1],
  rankingSize: 30, // cuántos puestos mostrar
  pixExpiryMins: 15,
  presenceWindowSecs: 30, // ventana para contar "en vivo"
};

// Menor nivel estrictamente mayor a un monto dado (para superar a alguien).
// Si ya está en el nivel máximo, devuelve el máximo (no se puede subir más).
export function nextTierAbove(currentAmountCents: number): number {
  for (const t of TIERS_CENTS) {
    if (t > currentAmountCents) return t;
  }
  return RULES.maxTierCents;
}

// ¿Es un nivel válido?
export function isValidTier(cents: number): boolean {
  return (TIERS_CENTS as readonly number[]).includes(cents);
}

// Cuánto hay que pagar para superar un monto dado (= próximo nivel).
export function priceToBeat(currentAmountCents: number): number {
  return nextTierAbove(currentAmountCents);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Textos de la interfaz (fácil de traducir/duplicar)
export const T = {
  eyebrow: "O RANKING DE CRIADORES QUE O DINHEIRO DECIDE",
  h1a: "Acha que é o melhor criador?",
  h1b: "Prove.",
  sub: "Os criadores são ordenados por quanto estão dispostos a apostar na própria atenção. Sem júri. Sem algoritmo. Só ego.",
  ctaEnter: "Entrar no ranking →",
  alreadyIn: "Já está no ranking? Use o mesmo @ para subir seu lance.",
  ranking: "Ranking",
  refresh: "Atualizar",
  colRank: "POSIÇÃO",
  colCreator: "CRIADOR",
  colClicks: "CLIQUES",
  colBid: "LANCE",
  steal: "Roubar posição",
  open: "Abrir",
  endOfRanking: "É isso, o ranking inteiro. Por enquanto.",
  costHint: (n: number, price: string) => `a posição #${n} custa ${price} — vai à luta`,
  widgetMostClicked: "Mais clicado (24h)",
  widgetLongestReign: "Reinado mais longo",
  widgetBiggestEgo: "Ego maior",
  live: "AO VIVO",
  footer:
    "Aqui os seguidores não importam. Outros rankings usam júri. O nosso usa Pix.",
} as const;
