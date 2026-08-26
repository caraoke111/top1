import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPaidBid } from "@/lib/bids";
import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

// Estado del pago (polling desde el checkout).
// En SANDBOX, autoconfirma cuando pasaron SANDBOX_AUTO_CONFIRM_SECS.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bid = await prisma.bid.findUnique({ where: { id } });
  if (!bid) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  if (bid.status === "pending") {
    // Expiración
    if (bid.expiresAt && bid.expiresAt.getTime() < Date.now()) {
      await prisma.bid.update({
        where: { id },
        data: { status: "expired" },
      });
      return NextResponse.json({ status: "expired" });
    }

    // Autoconfirmación de sandbox
    const autoSecs = parseInt(process.env.SANDBOX_AUTO_CONFIRM_SECS || "0", 10);
    if (bid.provider === "sandbox" && autoSecs > 0) {
      const elapsed = (Date.now() - bid.createdAt.getTime()) / 1000;
      if (elapsed >= autoSecs) {
        await applyPaidBid(id);
        return NextResponse.json({ status: "paid", auto: true });
      }
    }

    // Fallback por polling para proveedores reales (útil en local, donde el
    // webhook no llega a localhost). Consulta el estado directo al proveedor.
    if (bid.provider !== "sandbox" && bid.providerRef) {
      try {
        const paid = await getPaymentProvider().isPaid(bid.providerRef);
        if (paid) {
          await applyPaidBid(id);
          return NextResponse.json({ status: "paid", polled: true });
        }
      } catch {
        /* si falla la consulta, seguimos esperando el webhook */
      }
    }
  }

  const fresh = await prisma.bid.findUnique({ where: { id } });
  return NextResponse.json({ status: fresh?.status ?? "unknown" });
}
