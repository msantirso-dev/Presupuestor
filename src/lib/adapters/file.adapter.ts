import { SourceKind } from "@prisma/client";
import type { CatalogSourceAdapter, RawGrid } from "./types";
import { parseCsvToGrid, parseXlsxToGrid } from "../import/parse-grid";

export class FileExcelAdapter implements CatalogSourceAdapter {
  readonly kind = SourceKind.FILE_EXCEL;

  async loadGrid(input: {
    config: Record<string, unknown>;
    file?: { buffer: Buffer; name: string; mime: string };
  }): Promise<RawGrid> {
    if (!input.file) throw new Error("Se requiere archivo para FILE_EXCEL");
    return parseXlsxToGrid(input.file.buffer, 0);
  }
}

export class FileCsvAdapter implements CatalogSourceAdapter {
  readonly kind = SourceKind.FILE_CSV;

  async loadGrid(input: {
    config: Record<string, unknown>;
    file?: { buffer: Buffer; name: string; mime: string };
  }): Promise<RawGrid> {
    if (!input.file) throw new Error("Se requiere archivo para FILE_CSV");
    const text = input.file.buffer.toString("utf8");
    return parseCsvToGrid(text);
  }
}
