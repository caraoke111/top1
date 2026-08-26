import { prisma } from "@/lib/prisma";
import { RULES, priceToBeat, profileUrl } from "@/lib/site";
import type { RankRow, Widgets } from "@/lib/types";

export interface CreatorPayload {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  country?: string;
  category?: string;
  links?: { type: string; url: string }[];
}

// Aplica un lance pagado: crea/actualiza el creador con el nuevo monto,
// marca el Bid como pago y recalcula el reinado del #1. Idempotente.
export async function applyPaidBid(bidId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({ where: { id: bidId } });
    if (!bid || bid.status === "paid") return; // idempotente

    const payload: CreatorPayload = safeJson(bid.payload);
    const handle = bid.handle.toLowerCase().replace(/^@/, "");

    const existing = await tx.creator.findUnique({ where: { handle } });

    if (existing) {
      // Solo sube si el nuevo monto supera al vigente
      const amount = Math.max(bid.amountCents, existing.currentAmountCents);
      await tx.creator.update({
        where: { id: existing.id },
        data: {
          currentAmountCents: amount,
          // Permite refrescar datos de perfil si vinieron
          name: payload.name || existing.name,
          bio: payload.bio ?? existing.bio,
          avatarUrl: payload.avatarUrl || existing.avatarUrl,
          country: payload.country || existing.country,
          category: payload.category || existing.category,
          links: payload.links ? JSON.stringify(payload.links) : existing.links,
        },
      });
    } else {
      await tx.creator.create({
        data: {
          handle,
          name: payload.name || handle,
          bio: payload.bio || "",
          avatarUrl: payload.avatarUrl || "",
          country: payload.country || "",
          category: payload.category || "",
          links: JSON.stringify(payload.links || []),
          currentAmountCents: bid.amountCents,
        },
      });
    }

    await tx.bid.update({
      where: { id: bid.id },
      data: { status: "paid", paidAt: new Date() },
    });

    await recomputeReign(tx);
  });
}

// Mantiene reignStartedAt en el #1 actual y acumula longestReignSecs
// cuando alguien es destronado.
async function recomputeReign(tx: PrismaTx): Promise<void> {
  const top = await tx.creator.findFirst({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
  });
  if (!top) return;

  const reigning = await tx.creator.findFirst({
    where: { reignStartedAt: { not: null } },
  });

  const now = new Date();

  if (reigning && reigning.id !== top.id) {
    const secs = Math.floor(
      (now.getTime() - reigning.reignStartedAt!.getTime()) / 1000
    );
    await tx.creator.update({
      where: { id: reigning.id },
      data: {
        reignStartedAt: null,
        longestReignSecs: Math.max(reigning.longestReignSecs, secs),
      },
    });
  }

  if (!top.reignStartedAt) {
    await tx.creator.update({
      where: { id: top.id },
      data: { reignStartedAt: now },
    });
  }
}

export async function getRanking(): Promise<RankRow[]> {
  const creators = await prisma.creator.findMany({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
    take: RULES.rankingSize,
  });

  return creators.map((c, i) => {
    const links = safeJson(c.links) || [];
    return {
      id: c.id,
      rank: i + 1,
      handle: c.handle,
      name: c.name,
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      country: c.country,
      category: c.category,
      verified: c.verified,
      links,
      profileUrl: profileUrl(c.handle, links),
      clicks: c.clicks,
      amountCents: c.currentAmountCents,
      priceToBeatCents: priceToBeat(c.currentAmountCents),
      isKing: i === 0,
    };
  });
}

export async function getWidgets(): Promise<Widgets> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);

  const grouped = await prisma.clickEvent.groupBy({
    by: ["creatorId"],
    where: { createdAt: { gte: since } },
    _count: { creatorId: true },
    orderBy: { _count: { creatorId: "desc" } },
    take: 1,
  });

  let mostClicked24h: Widgets["mostClicked24h"] = null;
  if (grouped[0]) {
    const c = await prisma.creator.findUnique({
      where: { id: grouped[0].creatorId },
    });
    if (c)
      mostClicked24h = {
        handle: c.handle,
        name: c.name,
        avatarUrl: c.avatarUrl,
        profileUrl: profileUrl(c.handle, safeJson(c.links) || []),
        clicks: grouped[0]._count.creatorId,
      };
  }

  // Reinado más largo: considera el reinado en curso vs el histórico
  const all = await prisma.creator.findMany();
  let longestReign: Widgets["longestReign"] = null;
  for (const c of all) {
    const ongoing = c.reignStartedAt
      ? Math.floor((Date.now() - c.reignStartedAt.getTime()) / 1000)
      : 0;
    const secs = Math.max(c.longestReignSecs, ongoing);
    if (secs > 0 && (!longestReign || secs > longestReign.secs)) {
      longestReign = {
        handle: c.handle,
        name: c.name,
        avatarUrl: c.avatarUrl,
        profileUrl: profileUrl(c.handle, safeJson(c.links) || []),
        secs,
      };
    }
  }

  const king = await prisma.creator.findFirst({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
  });
  const biggestEgo = king
    ? {
        handle: king.handle,
        name: king.name,
        avatarUrl: king.avatarUrl,
        profileUrl: profileUrl(king.handle, safeJson(king.links) || []),
        amountCents: king.currentAmountCents,
      }
    : null;

  // Precio de entrada = superar al último puesto visible (o mínimo)
  const bottom = await prisma.creator.findMany({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
    take: RULES.rankingSize,
  });
  // Con lugar libre en el ranking, se entra desde el mínimo (R$1) y te ubicás
  // abajo. Solo si el ranking está LLENO hay que superar al último para entrar.
  const last = bottom[bottom.length - 1];
  const entryPriceCents =
    bottom.length >= RULES.rankingSize && last
      ? priceToBeat(last.currentAmountCents)
      : RULES.minEntryCents;

  return { mostClicked24h, longestReign, biggestEgo, entryPriceCents };
}

// ── helpers ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTx = any;

function safeJson<T = any>(s: string): T {
  try {
    return JSON.parse(s);
  } catch {
    return {} as T;
  }
}
