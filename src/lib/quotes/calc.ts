import { Prisma } from "@prisma/client";

function d(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n);
}

/** Precio unitario de venta: costo × (1 + margen%). */
export function unitSalePrice(unitCost: Prisma.Decimal, marginPercent: Prisma.Decimal) {
  const one = new Prisma.Decimal(1);
  const m = marginPercent.div(100);
  return unitCost.mul(one.add(m));
}

/** Subtotal línea: cantidad × precio venta × (1 - descuento línea%). */
export function lineSubtotal(
  quantity: Prisma.Decimal,
  unitCost: Prisma.Decimal,
  marginPercent: Prisma.Decimal,
  lineDiscountPercent: Prisma.Decimal,
) {
  const sale = unitSalePrice(unitCost, marginPercent);
  const disc = lineDiscountPercent.div(100);
  const factor = new Prisma.Decimal(1).sub(disc);
  return quantity.mul(sale).mul(factor);
}

export function quoteTotals(
  lines: { lineSubtotal: Prisma.Decimal }[],
  discountPercentOnTotal: Prisma.Decimal,
) {
  let sub = new Prisma.Decimal(0);
  for (const l of lines) {
    sub = sub.add(l.lineSubtotal);
  }
  const disc = discountPercentOnTotal.div(100);
  const total = sub.mul(new Prisma.Decimal(1).sub(disc));
  return { subtotal: sub, total };
}
