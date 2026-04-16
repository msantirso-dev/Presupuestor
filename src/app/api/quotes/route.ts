import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextQuoteNumber } from "@/lib/quotes/number";
import { serializeQuote } from "@/lib/quotes/serialize";

const createSchema = z.object({
  clientName: z.string().min(1).default("Cliente"),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const rows = await prisma.quote.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ quotes: rows.map(serializeQuote) });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const q = await prisma.quote.create({
    data: {
      number: nextQuoteNumber(),
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      clientPhone: parsed.data.clientPhone,
      notes: parsed.data.notes,
      discountPercent: new Prisma.Decimal(0),
      subtotal: new Prisma.Decimal(0),
      total: new Prisma.Decimal(0),
    },
    include: { lines: true },
  });

  return NextResponse.json({ quote: serializeQuote(q) }, { status: 201 });
}
