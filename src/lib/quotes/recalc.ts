import { prisma } from "@/lib/prisma";
import { quoteTotals } from "./calc";

export async function recalcQuoteTotals(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  });
  if (!quote) return;

  const { subtotal, total } = quoteTotals(quote.lines, quote.discountPercent);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { subtotal, total },
  });
}
