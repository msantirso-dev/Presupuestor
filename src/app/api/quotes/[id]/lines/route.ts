import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lineSubtotal } from "@/lib/quotes/calc";
import { recalcQuoteTotals } from "@/lib/quotes/recalc";

const postSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive().default(1),
  marginPercent: z.coerce.number().min(0).default(0),
  lineDiscountPercent: z.coerce.number().min(0).max(100).default(0),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: quoteId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    include: { provider: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const unitCost = product.costPrice ?? new Prisma.Decimal(0);
  const marginPercent = new Prisma.Decimal(parsed.data.marginPercent);
  const lineDiscountPercent = new Prisma.Decimal(parsed.data.lineDiscountPercent);
  const quantity = new Prisma.Decimal(parsed.data.quantity);
  const sub = lineSubtotal(quantity, unitCost, marginPercent, lineDiscountPercent);

  const last = await prisma.quoteLine.findFirst({
    where: { quoteId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? 0) + 1;

  const line = await prisma.quoteLine.create({
    data: {
      quoteId,
      productId: product.id,
      sortOrder,
      sku: product.sku,
      name: product.name,
      description: product.description,
      brand: product.brand,
      providerName: product.provider.name,
      quantity,
      unitCost,
      marginPercent,
      lineDiscountPercent,
      lineSubtotal: sub,
    },
  });

  await recalcQuoteTotals(quoteId);
  return NextResponse.json({ line }, { status: 201 });
}
