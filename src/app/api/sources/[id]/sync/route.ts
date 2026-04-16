import { NextResponse } from "next/server";
import { syncExistingSource } from "@/lib/ingest/import-products";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const r = await syncExistingSource(id);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
