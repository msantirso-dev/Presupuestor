import type { Prisma, SourceKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdapterForSource } from "@/lib/adapters/registry";
import { mapRowsToProducts } from "@/lib/catalog/map-rows";

type FileInput = { buffer: Buffer; name: string; mime: string };

export async function importProductsForProvider(params: {
  providerId: string;
  kind: SourceKind;
  sourceLabel?: string;
  config?: Prisma.JsonValue;
  file?: FileInput;
}) {
  const provider = await prisma.provider.findUnique({
    where: { id: params.providerId },
    include: { mappings: true },
  });
  if (!provider) throw new Error("Proveedor no encontrado");

  const adapter = getAdapterForSource(params.kind);
  const grid = await adapter.loadGrid({
    config: (params.config as Record<string, unknown>) ?? {},
    file: params.file,
  });

  if (grid.headers.length === 0) {
    throw new Error("No se detectaron columnas en el archivo/fuente");
  }

  const mapped = mapRowsToProducts(
    grid.headers,
    grid.rows,
    provider.mappings.map((m) => ({ sourceColumn: m.sourceColumn, targetField: m.targetField })),
  );

  const label =
    params.sourceLabel ??
    (params.file?.name ? `Import ${params.file.name}` : `Import ${new Date().toISOString()}`);

  return prisma.$transaction(async (tx) => {
    const ds = await tx.dataSource.create({
      data: {
        providerId: provider.id,
        kind: params.kind,
        label,
        config: (params.config as object) ?? {},
        lastSyncedAt: new Date(),
      },
    });

    await tx.product.deleteMany({ where: { dataSourceId: ds.id } });

    const chunk = 500;
    for (let i = 0; i < mapped.length; i += chunk) {
      const part = mapped.slice(i, i + chunk);
      await tx.product.createMany({
        data: part.map((p) => ({
          providerId: provider.id,
          dataSourceId: ds.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          brand: p.brand,
          costPrice: p.costPrice,
          listPrice: p.listPrice,
          currency: p.currency ?? "ARS",
          stock: p.stock,
          raw: p.raw as object,
        })),
      });
    }

    return { inserted: mapped.length, headers: grid.headers, dataSourceId: ds.id };
  });
}

export async function syncExistingSource(sourceId: string) {
  const source = await prisma.dataSource.findUnique({
    where: { id: sourceId },
    include: { provider: { include: { mappings: true } } },
  });
  if (!source) throw new Error("Fuente no encontrada");

  const adapter = getAdapterForSource(source.kind);
  const grid = await adapter.loadGrid({
    config: (source.config as Record<string, unknown>) ?? {},
  });

  const mapped = mapRowsToProducts(
    grid.headers,
    grid.rows,
    source.provider.mappings.map((m) => ({
      sourceColumn: m.sourceColumn,
      targetField: m.targetField,
    })),
  );

  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany({ where: { dataSourceId: source.id } });
    const chunk = 500;
    for (let i = 0; i < mapped.length; i += chunk) {
      const part = mapped.slice(i, i + chunk);
      await tx.product.createMany({
        data: part.map((p) => ({
          providerId: source.providerId,
          dataSourceId: source.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          brand: p.brand,
          costPrice: p.costPrice,
          listPrice: p.listPrice,
          currency: p.currency ?? "ARS",
          stock: p.stock,
          raw: p.raw as object,
        })),
      });
    }
    await tx.dataSource.update({
      where: { id: source.id },
      data: { lastSyncedAt: new Date() },
    });
  });

  return { inserted: mapped.length, headers: grid.headers };
}
