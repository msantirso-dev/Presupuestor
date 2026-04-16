import type { SourceKind } from "@prisma/client";
import type { CatalogSourceAdapter } from "./types";
import { FileCsvAdapter, FileExcelAdapter } from "./file.adapter";
import { GoogleSheetsPublicCsvAdapter } from "./google-sheets.adapter";
import { ApiStubAdapter } from "./api-stub.adapter";

const excel = new FileExcelAdapter();
const csv = new FileCsvAdapter();
const sheets = new GoogleSheetsPublicCsvAdapter();
const apiStub = new ApiStubAdapter();

export function getAdapterForSource(kind: SourceKind): CatalogSourceAdapter {
  switch (kind) {
    case "FILE_EXCEL":
      return excel;
    case "FILE_CSV":
      return csv;
    case "GOOGLE_SHEET":
      return sheets;
    case "API_STUB":
    default:
      return apiStub;
  }
}
