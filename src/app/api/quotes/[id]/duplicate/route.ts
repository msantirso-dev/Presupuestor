import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextQuoteNumber } from "@/lib/quotes/number";
import { lineSubtotal } from "@/lib/quotes/calc";
import { recalcQuoteTotals } from "@/lib/quotes/recalc";
import { serializeQuote } from "@/lib/quotes/serialize";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const src = await prisma.quote.findUnique({
    where: { id },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!src) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const dup = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        number: nextQuoteNumber(),
        clientName: src.clientName,
        clientEmail: src.clientEmail,
        clientPhone: src.clientPhone,
        notes: src.notes,
        issueDate: new Date(),
        discountPercent: src.discountPercent,
        subtotal: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
      },
    });

    for (const l of src.lines) {
      const sub = lineSubtotal(l.quantity, l.unitCost, l.marginPercent, l.lineDiscountPercent);
      await tx.quoteLine.create({
        data: {
          quoteId: q.id,
          productId: l.productId,
          sortOrder: l.sortOrder,
          sku: l.sku,
          name: l.name,
          description: l.description,
          brand: l.brand,
          providerName: l.providerName,
          quantity: l.quantity,
          unitCost: l.unitCost,
          marginPercent: l.marginPercent,
          lineDiscountPercent: l.lineDiscountPercent,
          lineSubtotal: sub,
        },
      });
    }

    return q;
  });

  await recalcQuoteTotals(dup.id);
  const full = await prisma.quote.findUniqueOrThrow({
    where: { id: dup.id },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ quote: serializeQuote(full) }, { status: 201 });
}
