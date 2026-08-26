import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RULES, formatBRL } from "@/lib/site";
import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

const linkSchema = z.object({
  type: z.string().max(30),
  url: z.string().url().max(300),
});

const bodySchema = z.object({
  handle: z
    .string()
    .min(2)
    .max(40)
    .transform((s) => s.trim().toLowerCase().replace(/^@/, "")),
  amountCents: z.number().int().positive().max(2_000_000_000), // ~R$20M (límite seguro del Int de la DB)
  name: z.string().max(80).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().max(400).optional().or(z.literal("")),
  country: z.string().max(8).optional(),
  category: z.string().max(40).optional(),
  links: z.array(linkSchema).max(6).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const b = parsed.data;

  // Monto mínimo para entrar
  if (b.amountCents < RULES.minEntryCents) {
    return NextResponse.json(
      { error: `O lance mínimo é ${formatBRL(RULES.minEntryCents)}.` },
      { status: 400 }
    );
  }

  const existing = await prisma.creator.findUnique({
    where: { handle: b.handle },
  });

  if (existing && b.amountCents <= existing.currentAmountCents) {
    return NextResponse.json(
      {
        error: `Seu lance precisa superar o atual (${formatBRL(
          existing.currentAmountCents
        )}).`,
      },
      { status: 409 }
    );
  }

  // Crea el Bid primero (pending) para tener id estable
  const bid = await prisma.bid.create({
    data: {
      creatorId: existing?.id,
      handle: b.handle,
      amountCents: b.amountCents,
      status: "pending",
      provider: process.env.PAYMENT_PROVIDER || "sandbox",
      payload: JSON.stringify({
        name: b.name,
        bio: b.bio,
        avatarUrl: b.avatarUrl || undefined,
        country: b.country,
        category: b.category,
        links: b.links,
      }),
    },
  });

  const provider = getPaymentProvider();
  let charge;
  try {
    charge = await provider.createCharge({
      bidId: bid.id,
      amountCents: b.amountCents,
      description: `Impulso de perfil @${b.handle} — LanceTop`,
      payerName: b.name,
    });
  } catch (e) {
    await prisma.bid.update({
      where: { id: bid.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar o pagamento." },
      { status: 502 }
    );
  }

  await prisma.bid.update({
    where: { id: bid.id },
    data: {
      providerRef: charge.providerRef,
      pixQr: charge.pixQr || "",
      pixCode: charge.pixCode || "",
      expiresAt: charge.expiresAt,
    },
  });

  return NextResponse.json({
    bidId: bid.id,
    mode: charge.mode,
    pixQr: charge.pixQr || "",
    pixCode: charge.pixCode || "",
    checkoutUrl: charge.checkoutUrl || "",
    expiresAt: charge.expiresAt,
    amountCents: b.amountCents,
    provider: bid.provider,
  });
}
