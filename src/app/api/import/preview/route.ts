import { NextResponse } from "next/server";
import { parseCsvToGrid, parseXlsxToGrid } from "@/lib/import/parse-grid";
import { suggestMappings } from "@/lib/catalog/auto-map";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Falta file" }, { status: 400 });
  }
  const name = (file as File).name ?? "upload";
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = name.toLowerCase().split(".").pop();
  const grid =
    ext === "csv" ? parseCsvToGrid(buffer.toString("utf8")) : parseXlsxToGrid(buffer, 0);

  return NextResponse.json({
    headers: grid.headers,
    rowCount: grid.rows.length,
    suggestedMappings: suggestMappings(grid.headers),
  });
}
