import { SourceKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { importProductsForProvider } from "@/lib/ingest/import-products";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo (campo file)" }, { status: 400 });
  }

  const name = (file as File).name ?? "upload";
  const mime = (file as File).type ?? "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  const ext = name.toLowerCase().split(".").pop();
  const kind =
    ext === "csv" || mime.includes("csv")
      ? SourceKind.FILE_CSV
      : ext === "xlsx" || ext === "xls" || mime.includes("sheet")
        ? SourceKind.FILE_EXCEL
        : SourceKind.FILE_EXCEL;

  try {
    const result = await importProductsForProvider({
      providerId: id,
      kind,
      file: { buffer, name, mime },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al importar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
