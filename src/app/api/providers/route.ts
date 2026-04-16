import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});

export async function GET() {
  const rows = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true, sources: true } },
    },
  });
  return NextResponse.json({ providers: rows });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const baseSlug = parsed.data.slug ?? slugify(parsed.data.name);
  let slug = baseSlug || "proveedor";
  let n = 1;
  while (await prisma.provider.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n++}`;
  }
  const p = await prisma.provider.create({
    data: { name: parsed.data.name, slug },
  });
  return NextResponse.json({ provider: p }, { status: 201 });
}
