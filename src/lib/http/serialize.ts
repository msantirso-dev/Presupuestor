import type { Prisma } from "@prisma/client";

export function dec(v: Prisma.Decimal | null | undefined) {
  if (v == null) return null;
  return v.toString();
}
