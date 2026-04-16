import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Prisma } from "@prisma/client";

type Line = {
  name: string;
  sku: string | null;
  brand: string | null;
  providerName: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  marginPercent: Prisma.Decimal;
  lineDiscountPercent: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
};

export async function buildQuotePdf(input: {
  number: string;
  clientName: string;
  issueDate: Date;
  lines: Line[];
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const x = 48;
  const lh = 14;

  const text = (t: string, xx: number, yy: number, f = font, size = 11, color = rgb(0.1, 0.1, 0.12)) => {
    page.drawText(t, { x: xx, y: yy, size, font: f, color, maxWidth: 500 });
  };

  text("Presupuesto", x, y, bold, 18);
  y -= 28;
  text(`Nº ${input.number}`, x, y, bold, 12);
  y -= lh;
  text(`Cliente: ${input.clientName}`, x, y);
  y -= lh;
  text(`Fecha: ${input.issueDate.toLocaleDateString()}`, x, y);
  y -= 24;

  text("Detalle", x, y, bold, 11);
  y -= lh;

  for (const l of input.lines) {
    if (y < 120) break;
    const head = `${l.name} — ${l.providerName}`;
    text(head.length > 85 ? `${head.slice(0, 82)}…` : head, x, y, bold, 10);
    y -= 12;
    const bits = [`Cant ${l.quantity}`, `Costo u. ${l.unitCost.toFixed(2)}`, `Margen ${l.marginPercent.toFixed(2)}%`, `Desc ${l.lineDiscountPercent.toFixed(2)}%`, `Subt ${l.lineSubtotal.toFixed(2)}`];
    text(bits.join(" · "), x, y, font, 9, rgb(0.35, 0.35, 0.38));
    y -= 16;
  }

  y -= 8;
  text(`Subtotal: ${input.subtotal.toFixed(2)}`, x, y, bold, 11);
  y -= lh;
  text(`Descuento global: ${input.discountPercent.toFixed(2)}%`, x, y);
  y -= lh;
  text(`Total: ${input.total.toFixed(2)}`, x, y, bold, 13);

  return doc.save();
}
