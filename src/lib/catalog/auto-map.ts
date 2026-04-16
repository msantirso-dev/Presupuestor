import type { StandardField } from "./standard-fields";

const SYNONYMS: Record<StandardField, string[]> = {
  sku: ["sku", "codigo", "código", "code", "articulo", "artículo", "id", "ref", "referencia"],
  name: ["nombre", "name", "producto", "titulo", "título", "descripcion corta", "item"],
  description: ["descripcion", "descripción", "detalle", "obs", "observaciones", "notas"],
  brand: ["marca", "brand", "fabricante"],
  costPrice: ["costo", "precio costo", "cost", "precio compra", "p compra", "coste"],
  listPrice: ["precio", "precio lista", "pvp", "precio venta", "p venta", "lista"],
  currency: ["moneda", "currency"],
  stock: ["stock", "cantidad", "existencia", "inv"],
};

function normHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function suggestMappings(headers: string[]): Partial<Record<string, StandardField>> {
  const out: Partial<Record<string, StandardField>> = {};
  const used = new Set<StandardField>();

  for (const raw of headers) {
    const key = normHeader(raw);
    if (!key) continue;

    for (const field of Object.keys(SYNONYMS) as StandardField[]) {
      if (used.has(field)) continue;
      const match = SYNONYMS[field].some((s) => key === normHeader(s) || key.includes(normHeader(s)));
      if (match) {
        out[raw] = field;
        used.add(field);
        break;
      }
    }
  }

  return out;
}
