import { Prisma } from "@prisma/client";
import type { StandardField } from "./standard-fields";
import { isStandardField } from "./standard-fields";
import { suggestMappings } from "./auto-map";

export type MappingInput = { sourceColumn: string; targetField: string }[];

export type NormalizedProductInput = {
  sku?: string | null;
  name: string;
  description?: string | null;
  brand?: string | null;
  costPrice?: Prisma.Decimal | null;
  listPrice?: Prisma.Decimal | null;
  currency?: string | null;
  stock?: number | null;
  raw: Record<string, string>;
};

function parseNumber(raw: string | undefined): Prisma.Decimal | null {
  if (raw == null) return null;
  const s = raw.replace(/\s/g, "").replace(",", ".");
  if (!s || Number.isNaN(Number(s))) return null;
  return new Prisma.Decimal(s);
}

function parseIntSafe(raw: string | undefined): number | null {
  if (raw == null) return null;
  const n = Number.parseInt(raw.replace(/\s/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function buildFieldResolver(headers: string[], explicit: MappingInput) {
  const map = new Map<string, StandardField>();
  for (const m of explicit) {
    if (!isStandardField(m.targetField)) continue;
    map.set(m.sourceColumn, m.targetField);
  }
  const suggested = suggestMappings(headers);
  for (const [h, f] of Object.entries(suggested)) {
    if (f && !map.has(h)) map.set(h, f);
  }
  return (row: Record<string, string>, field: StandardField): string | undefined => {
    for (const [col, tgt] of map) {
      if (tgt === field && row[col] != null && String(row[col]).trim() !== "") {
        return String(row[col]);
      }
    }
    return undefined;
  };
}

export function mapRowsToProducts(
  headers: string[],
  rows: Record<string, string>[],
  explicitMappings: MappingInput,
): NormalizedProductInput[] {
  const resolve = buildFieldResolver(headers, explicitMappings);
  const out: NormalizedProductInput[] = [];

  for (const row of rows) {
    const name =
      resolve(row, "name") ??
      resolve(row, "sku") ??
      resolve(row, "description") ??
      "";
    if (!name.trim()) continue;

    out.push({
      sku: resolve(row, "sku") ?? null,
      name: name.trim(),
      description: resolve(row, "description")?.trim() || null,
      brand: resolve(row, "brand")?.trim() || null,
      costPrice: parseNumber(resolve(row, "costPrice")),
      listPrice: parseNumber(resolve(row, "listPrice")),
      currency: resolve(row, "currency")?.trim() || "ARS",
      stock: parseIntSafe(resolve(row, "stock")),
      raw: row,
    });
  }

  return out;
}
