import type { Prisma } from "@prisma/client";
import { dec } from "@/lib/http/serialize";

export type QuoteWithLines = {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  issueDate: Date;
  notes: string | null;
  discountPercent: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  lines: {
    id: string;
    sku: string | null;
    name: string;
    description: string | null;
    brand: string | null;
    providerName: string;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    marginPercent: Prisma.Decimal;
    lineDiscountPercent: Prisma.Decimal;
    lineSubtotal: Prisma.Decimal;
    productId: string | null;
    sortOrder: number;
  }[];
};

export function serializeQuote(q: QuoteWithLines) {
  return {
    id: q.id,
    number: q.number,
    clientName: q.clientName,
    clientEmail: q.clientEmail,
    clientPhone: q.clientPhone,
    issueDate: q.issueDate,
    notes: q.notes,
    discountPercent: dec(q.discountPercent),
    subtotal: dec(q.subtotal),
    total: dec(q.total),
    lines: q.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      sortOrder: l.sortOrder,
      sku: l.sku,
      name: l.name,
      description: l.description,
      brand: l.brand,
      providerName: l.providerName,
      quantity: dec(l.quantity),
      unitCost: dec(l.unitCost),
      marginPercent: dec(l.marginPercent),
      lineDiscountPercent: dec(l.lineDiscountPercent),
      lineSubtotal: dec(l.lineSubtotal),
    })),
  };
}
