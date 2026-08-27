import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIgAccounts, postImageToAccount } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COOLDOWN_MIN = 30; // no anunciar más de un #1 cada 30 min
const STAGGER_MIN = 8; // separación entre cuentas (anti-spam)
const MAX_POR_RUN = 2; // cuántos posteos procesa cada corrida

const brl = (c: number) => "R$ " + (c / 100).toFixed(2).replace(".", ",");

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado, nada se ejecuta
  const auth = req.headers.get("authorization") || "";
  const key = new URL(req.url).searchParams.get("key") || "";
  return auth === `Bearer ${secret}` || key === secret;
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://egotop.lol";
  const resumen: Record<string, unknown> = {};

  // ── 1. ¿Cambió el #1? ────────────────────────────────────────
  const rey = await prisma.creator.findFirst({
    orderBy: [{ currentAmountCents: "desc" }, { updatedAt: "asc" }],
  });
  let state = await prisma.kingState.findUnique({ where: { id: "king" } });
  if (!state) state = await prisma.kingState.create({ data: { id: "king" } });

  if (rey && rey.handle !== state.handle) {
    const primeraVez = !state.handle;
    const enCooldown =
      state.lastPostAt && Date.now() - state.lastPostAt.getTime() < COOLDOWN_MIN * 60000;

    if (primeraVez || enCooldown) {
      await prisma.kingState.update({
        where: { id: "king" },
        data: { handle: rey.handle, amountCents: rey.currentAmountCents },
      });
      resumen.deteccion = primeraVez ? "rey inicial (no posteo)" : "cambió pero en cooldown";
    } else {
      // Encolar un posteo por cuenta, escalonado
      const cuentas = getIgAccounts();
      const h = rey.handle.replace(/^@/, "");
      const tagValido = /^[a-zA-Z0-9._]{1,30}$/.test(h);
      const userTags = tagValido
        ? JSON.stringify([{ username: h, x: 0.5, y: 0.42 }])
        : "";
      const caption =
        `🚨 NOVO #1 no EgoTop! @${h} pagou ${brl(rey.currentAmountCents)} pra dominar o ranking. ` +
        `Acha que é melhor? Prove. 👑\n\n#egotop #ranking #top1 #brasil #criadores`;
      const imageUrl = `${base}/api/king-card.png?k=${encodeURIComponent(h)}`;

      const ahora = Date.now();
      await prisma.postJob.createMany({
        data: cuentas.map((c, i) => ({
          igUserId: c.igUserId,
          handle: c.handle || "",
          imageUrl,
          caption,
          userTags,
          scheduledAt: new Date(ahora + i * STAGGER_MIN * 60000),
        })),
      });
      await prisma.kingState.update({
        where: { id: "king" },
        data: {
          handle: rey.handle,
          amountCents: rey.currentAmountCents,
          lastPostAt: new Date(),
        },
      });
      resumen.deteccion = `NOVO #1 @${h} — ${cuentas.length} posteo(s) encolado(s)`;
    }
  } else {
    resumen.deteccion = "sin cambios en el #1";
  }

  // ── 2. Procesar posteos vencidos (escalonado) ────────────────
  const vencidos = await prisma.postJob.findMany({
    where: { status: "pending", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: MAX_POR_RUN,
  });
  const cuentasTok = getIgAccounts();
  const posteos: unknown[] = [];
  for (const job of vencidos) {
    try {
      const cta = cuentasTok.find((a) => a.igUserId === job.igUserId);
      const postId = await postImageToAccount({
        igUserId: job.igUserId,
        imageUrl: job.imageUrl,
        caption: job.caption,
        userTags: job.userTags ? JSON.parse(job.userTags) : undefined,
        token: cta?.token,
      });
      await prisma.postJob.update({ where: { id: job.id }, data: { status: "done", postId } });
      posteos.push({ handle: job.handle, ok: true, postId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.postJob.update({ where: { id: job.id }, data: { status: "failed", error: msg } });
      posteos.push({ handle: job.handle, ok: false, error: msg });
    }
  }
  resumen.posteos = posteos;

  return NextResponse.json({ ok: true, ...resumen });
}
