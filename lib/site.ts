// Configuración central de marca, reglas y textos (PT-BR).
// Cambiá SITE.name / SITE.tagline para renombrar todo el sitio.

export const SITE = {
  name: "EgoTop",
  tagline: "o ranking de criadores que o dinheiro decide",
  domain: "egotop.lol",
  currency: "BRL",
  currencySymbol: "R$",
  locale: "pt-BR",
};

// Reglas del juego (en centavos de R$). Modelo de PUJA LIBRE: cualquier monto
// desde el mínimo. Para superar a alguien se paga máx(+stepAbs, +stepPct).
// (Con InfinitePay/Mercado Pago el monto es dinámico; Hotmart necesitaría niveles fijos.)
export const RULES = {
  minEntryCents: 100, // R$1,00 mínimo para entrar
  stepAbsCents: 100, // +R$1,00 mínimo para robar un puesto
  stepPct: 0.05, // o +5%, lo que sea mayor
  rankingSize: 30, // cuántos puestos mostrar
  pixExpiryMins: 15,
  presenceWindowSecs: 30, // ventana para contar "en vivo"
};

// Cuánto hay que pagar para superar un monto dado.
export function priceToBeat(currentAmountCents: number): number {
  const step = Math.max(
    RULES.stepAbsCents,
    Math.ceil((currentAmountCents * RULES.stepPct) / 100) * 100
  );
  return currentAmountCents + step;
}

// URL del perfil del creador: usa el primer link guardado (Instagram, TikTok,
// lo que sea) y, si no hay, cae en Instagram por el @.
export function profileUrl(
  handle: string,
  links?: { url: string }[]
): string {
  const first = links?.find((l) => l.url && /^https?:\/\//i.test(l.url));
  if (first) return first.url;
  return `https://instagram.com/${handle}`;
}

// Resuelve la foto de avatar: 1) URL propia si la cargó; 2) TikTok automático
// (unavatar, gratis); 3) vacío → el componente muestra las iniciales.
// Instagram no se puede traer gratis, así que va manual (URL) o iniciales.
export function resolveAvatar(
  handle: string,
  avatarUrl: string,
  links?: { url: string }[]
): string {
  if (avatarUrl) return avatarUrl;
  const url = (links?.[0]?.url || "").toLowerCase();
  if (url.includes("tiktok.com")) {
    return `https://unavatar.io/tiktok/${handle.replace(/^@/, "")}`;
  }
  return "";
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
