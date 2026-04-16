import * as XLSX from "xlsx";
import Papa from "papaparse";

export type RawGrid = {
  headers: string[];
  rows: Record<string, string>[];
};

function cleanHeaders(headers: (string | undefined)[]) {
  return headers.map((h, i) => (h == null || String(h).trim() === "" ? `col_${i + 1}` : String(h).trim()));
}

export function parseCsvToGrid(csvText: string): RawGrid {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const data = parsed.data.filter((r) => r.some((c) => String(c).trim() !== ""));
  if (data.length === 0) return { headers: [], rows: [] };
  const headers = cleanHeaders(data[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < data.length; i++) {
    const line = data[i];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = line[idx] != null ? String(line[idx]) : "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

function workbookToGrid(wb: XLSX.WorkBook, sheetIndex = 0): RawGrid {
  const sheetName = wb.SheetNames[sheetIndex] ?? wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
  const filtered = aoa.filter((r) => r.some((c) => String(c).trim() !== ""));
  if (filtered.length === 0) return { headers: [], rows: [] };
  const headers = cleanHeaders(filtered[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < filtered.length; i++) {
    const line = filtered[i];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = line[idx] != null ? String(line[idx]) : "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function parseXlsxToGrid(buffer: Buffer, sheetIndex = 0): RawGrid {
  const wb = XLSX.read(buffer, { type: "buffer" });
  return workbookToGrid(wb, sheetIndex);
}

/** Para el navegador (evita subir el binario completo y topar el límite ~4.5 MB de Vercel). */
export function parseXlsxToGridArrayBuffer(ab: ArrayBuffer, sheetIndex = 0): RawGrid {
  const wb = XLSX.read(new Uint8Array(ab), { type: "array" });
  return workbookToGrid(wb, sheetIndex);
}
