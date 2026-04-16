export const STANDARD_FIELDS = [
  "sku",
  "name",
  "description",
  "brand",
  "costPrice",
  "listPrice",
  "currency",
  "stock",
] as const;

export type StandardField = (typeof STANDARD_FIELDS)[number];

export function isStandardField(v: string): v is StandardField {
  return (STANDARD_FIELDS as readonly string[]).includes(v);
}
