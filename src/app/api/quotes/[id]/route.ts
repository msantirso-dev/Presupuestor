import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recalcQuoteTotals } from "@/lib/quotes/recalc";
import { serializeQuote } from "@/lib/quotes/serialize";

const patchSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().nullable().optional(),
  clientPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  issueDate: z.string().datetime().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const q = await prisma.quote.findUnique({
    where: { id },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!q) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ quote: serializeQuote(q) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Prisma.QuoteUpdateInput = {};
  if (parsed.data.clientName != null) data.clientName = parsed.data.clientName;
  if (parsed.data.clientEmail !== undefined) data.clientEmail = parsed.data.clientEmail;
  if (parsed.data.clientPhone !== undefined) data.clientPhone = parsed.data.clientPhone;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.issueDate != null) data.issueDate = new Date(parsed.data.issueDate);
  if (parsed.data.discountPercent != null) {
    data.discountPercent = new Prisma.Decimal(parsed.data.discountPercent);
  }

  try {
    await prisma.quote.update({ where: { id }, data });
    await recalcQuoteTotals(id);
    const q = await prisma.quote.findUniqueOrThrow({
      where: { id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ quote: serializeQuote(q) });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
