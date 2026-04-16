import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dec } from "@/lib/http/serialize";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ groups: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      provider: { isActive: true },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 200,
    orderBy: [{ provider: { name: "asc" } }, { name: "asc" }],
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });

  const map = new Map<string, { provider: (typeof products)[0]["provider"]; items: typeof products }>();
  for (const p of products) {
    const key = p.provider.id;
    const g = map.get(key);
    if (!g) {
      map.set(key, { provider: p.provider, items: [p] });
    } else {
      g.items.push(p);
    }
  }

  const groups = [...map.values()].map((g) => ({
    provider: g.provider,
    products: g.items.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      brand: p.brand,
      costPrice: dec(p.costPrice),
      listPrice: dec(p.listPrice),
      currency: p.currency,
      stock: p.stock,
    })),
  }));

  return NextResponse.json({ groups });
}
