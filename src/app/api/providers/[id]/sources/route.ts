import { Prisma, SourceKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncExistingSource } from "@/lib/ingest/import-products";

const postSchema = z.object({
  kind: z.union([z.literal(SourceKind.GOOGLE_SHEET), z.literal(SourceKind.API_STUB)]),
  label: z.string().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  syncNow: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

  const source = await prisma.dataSource.create({
    data: {
      providerId: id,
      kind: parsed.data.kind,
      label: parsed.data.label ?? null,
      config: parsed.data.config as Prisma.InputJsonValue,
    },
  });

  if (parsed.data.syncNow) {
    try {
      const r = await syncExistingSource(source.id);
      return NextResponse.json({ source, sync: r }, { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al sincronizar";
      return NextResponse.json({ source, syncError: msg }, { status: 201 });
    }
  }

  return NextResponse.json({ source }, { status: 201 });
}
