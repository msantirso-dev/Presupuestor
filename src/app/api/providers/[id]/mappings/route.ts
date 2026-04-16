import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isStandardField } from "@/lib/catalog/standard-fields";

const putSchema = z.object({
  mappings: z.array(
    z.object({
      sourceColumn: z.string().min(1),
      targetField: z.string().min(1),
    }),
  ),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  for (const m of parsed.data.mappings) {
    if (!isStandardField(m.targetField)) {
      return NextResponse.json(
        { error: `Campo estándar inválido: ${m.targetField}` },
        { status: 400 },
      );
    }
  }

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.columnMapping.deleteMany({ where: { providerId: id } });
    if (parsed.data.mappings.length > 0) {
      await tx.columnMapping.createMany({
        data: parsed.data.mappings.map((m) => ({
          providerId: id,
          sourceColumn: m.sourceColumn,
          targetField: m.targetField,
        })),
      });
    }
  });

  const mappings = await prisma.columnMapping.findMany({ where: { providerId: id } });
  return NextResponse.json({ mappings });
}
