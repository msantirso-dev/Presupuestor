import { SourceKind, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mapRowsToProducts } from "@/lib/catalog/map-rows";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  dataSourceId: z.string().min(1).optional(),
  label: z.string().max(240).optional(),
  kind: z.enum(["FILE_CSV", "FILE_EXCEL"]),
  headers: z.array(z.string()).max(400),
  rows: z.array(z.record(z.string(), z.string())).max(120),
  finalize: z.boolean().optional(),
});

export const maxDuration = 60;

async function insertMapped(
  tx: Prisma.TransactionClient,
  providerId: string,
  dataSourceId: string,
  mapped: ReturnType<typeof mapRowsToProducts>,
) {
  const chunk = 500;
  for (let i = 0; i < mapped.length; i += chunk) {
    const part = mapped.slice(i, i + chunk);
    await tx.product.createMany({
      data: part.map((p) => ({
        providerId,
        dataSourceId,
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
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: providerId } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const body = parsed.data;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { mappings: true },
  });
  if (!provider) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  const mappings = provider.mappings.map((m) => ({
    sourceColumn: m.sourceColumn,
    targetField: m.targetField,
  }));

  const kindEnum = body.kind as SourceKind;

  if (!body.dataSourceId && body.rows.length === 0) {
    return NextResponse.json({ error: "No hay filas en el primer lote" }, { status: 400 });
  }

  const normalized = mapRowsToProducts(body.headers, body.rows, mappings);
  if (body.rows.length > 0 && normalized.length === 0) {
    return NextResponse.json(
      { error: "Ninguna fila pudo mapearse (revisá el mapeo columnas↔campos)" },
      { status: 400 },
    );
  }

  try {
    if (!body.dataSourceId) {
      const label = body.label ?? `Import ${new Date().toISOString()}`;
      const dataSourceId = await prisma.$transaction(async (tx) => {
        const ds = await tx.dataSource.create({
          data: {
            providerId,
            kind: kindEnum,
            label,
            config: {},
            lastSyncedAt: null,
          },
        });
        if (normalized.length > 0) {
          await insertMapped(tx, providerId, ds.id, normalized);
        }
        if (body.finalize) {
          await tx.dataSource.update({
            where: { id: ds.id },
            data: { lastSyncedAt: new Date() },
          });
        }
        return ds.id;
      });
      const insertedTotal = await prisma.product.count({ where: { dataSourceId } });
      return NextResponse.json({
        dataSourceId,
        insertedChunk: normalized.length,
        insertedTotal,
      });
    }

    const ds = await prisma.dataSource.findFirst({
      where: { id: body.dataSourceId, providerId },
    });
    if (!ds) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (normalized.length > 0) {
        await insertMapped(tx, providerId, ds.id, normalized);
      }
      if (body.finalize) {
        await tx.dataSource.update({
          where: { id: ds.id },
          data: { lastSyncedAt: new Date() },
        });
      }
    });

    const insertedTotal = await prisma.product.count({ where: { dataSourceId: ds.id } });
    return NextResponse.json({
      dataSourceId: ds.id,
      insertedChunk: normalized.length,
      insertedTotal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
