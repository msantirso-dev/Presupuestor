import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildQuotePdf } from "@/lib/quotes/pdf";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const q = await prisma.quote.findUnique({
    where: { id },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!q) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const bytes = await buildQuotePdf({
    number: q.number,
    clientName: q.clientName,
    issueDate: q.issueDate,
    lines: q.lines,
    subtotal: q.subtotal,
    total: q.total,
    discountPercent: q.discountPercent,
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="presupuesto-${q.number}.pdf"`,
    },
  });
}
