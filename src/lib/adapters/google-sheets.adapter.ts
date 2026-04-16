import { SourceKind } from "@prisma/client";
import type { CatalogSourceAdapter, RawGrid } from "./types";
import { parseCsvToGrid } from "../import/parse-grid";

type SheetConfig = {
  spreadsheetId?: string;
  gid?: string;
};

/**
 * MVP: descarga el CSV público de Google Sheets (hoja publicada o “Anyone with link can view”).
 * Para OAuth / service account se puede reemplazar esta clase sin tocar el resto del flujo.
 */
export class GoogleSheetsPublicCsvAdapter implements CatalogSourceAdapter {
  readonly kind = SourceKind.GOOGLE_SHEET;

  async loadGrid(input: { config: Record<string, unknown> }): Promise<RawGrid> {
    const cfg = input.config as SheetConfig;
    const spreadsheetId = cfg.spreadsheetId;
    if (!spreadsheetId || typeof spreadsheetId !== "string") {
      throw new Error("config.spreadsheetId es obligatorio");
    }
    const gid = cfg.gid != null ? String(cfg.gid) : "0";
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId,
    )}/export?format=csv&gid=${encodeURIComponent(gid)}`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      throw new Error(
        `No se pudo leer la hoja (${res.status}). Verificá permisos públicos o el gid.`,
      );
    }
    const text = await res.text();
    return parseCsvToGrid(text);
  }
}
