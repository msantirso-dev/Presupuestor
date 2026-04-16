import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lineSubtotal } from "@/lib/quotes/calc";
import { recalcQuoteTotals } from "@/lib/quotes/recalc";

const patchSchema = z.object({
  quantity: z.coerce.number().positive().optional(),
  marginPercent: z.coerce.number().min(0).optional(),
  lineDiscountPercent: z.coerce.number().min(0).max(100).optional(),
});

type Ctx = { params: Promise<{ id: string; lineId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: quoteId, lineId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.quoteLine.findFirst({
    where: { id: lineId, quoteId },
  });
  if (!existing) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  const quantity =
    parsed.data.quantity != null ? new Prisma.Decimal(parsed.data.quantity) : existing.quantity;
  const marginPercent =
    parsed.data.marginPercent != null
      ? new Prisma.Decimal(parsed.data.marginPercent)
      : existing.marginPercent;
  const lineDiscountPercent =
    parsed.data.lineDiscountPercent != null
      ? new Prisma.Decimal(parsed.data.lineDiscountPercent)
      : existing.lineDiscountPercent;

  const sub = lineSubtotal(quantity, existing.unitCost, marginPercent, lineDiscountPercent);

  const line = await prisma.quoteLine.update({
    where: { id: lineId },
    data: { quantity, marginPercent, lineDiscountPercent, lineSubtotal: sub },
  });

  await recalcQuoteTotals(quoteId);
  return NextResponse.json({ line });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: quoteId, lineId } = await ctx.params;
  const existing = await prisma.quoteLine.findFirst({
    where: { id: lineId, quoteId },
  });
  if (!existing) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });

  await prisma.quoteLine.delete({ where: { id: lineId } });
  await recalcQuoteTotals(quoteId);
  return NextResponse.json({ ok: true });
}
