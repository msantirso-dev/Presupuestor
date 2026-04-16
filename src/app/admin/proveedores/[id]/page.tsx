"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { suggestMappings } from "@/lib/catalog/auto-map";
import { STANDARD_FIELDS, type StandardField } from "@/lib/catalog/standard-fields";
import { fetchErrorMessage, parseFetchJson } from "@/lib/http/parse-fetch-json";
import { parseCsvToGrid, parseXlsxToGridArrayBuffer } from "@/lib/import/parse-grid";

type Mapping = { id: string; sourceColumn: string; targetField: string };
type Source = { id: string; kind: string; label: string | null; lastSyncedAt: string | null };

type ProviderDetail = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  mappings: Mapping[];
  sources: Source[];
  _count: { products: number };
};

export default function ProveedorDetallePage() {
  const params = useParams();
  const id = params.id as string;

  const [p, setP] = useState<ProviderDetail | null>(null);
  const [mapState, setMapState] = useState<Record<string, StandardField | "">>({});
  const [sheetId, setSheetId] = useState("");
  const [gid, setGid] = useState("0");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(`/api/providers/${id}`);
    const parsed = await parseFetchJson<{ provider?: ProviderDetail; error?: string }>(r);
    if (!parsed.ok || !parsed.data?.provider) {
      setErr(fetchErrorMessage(parsed) ?? parsed.data?.error ?? "Error");
      setP(null);
      return;
    }
    const prov = parsed.data.provider;
    setP(prov);
    const m: Record<string, StandardField | ""> = {};
    for (const row of prov.mappings) {
      m[row.sourceColumn] = row.targetField as StandardField;
    }
    setMapState(m);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveName(next: string) {
    setErr(null);
    await fetch(`/api/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    await load();
  }

  async function previewFile(file: File) {
    setErr(null);
    setMsg(null);
    let grid;
    try {
      const ab = await file.arrayBuffer();
      const ext = file.name.toLowerCase().split(".").pop();
      const isCsv = ext === "csv" || file.type.includes("csv");
      grid = isCsv
        ? parseCsvToGrid(new TextDecoder("utf-8").decode(ab))
        : parseXlsxToGridArrayBuffer(ab);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo leer el archivo");
      return;
    }
    const suggested = suggestMappings(grid.headers);
    const next: Record<string, StandardField | ""> = { ...mapState };
    for (const h of grid.headers) {
      if (!(h in next)) {
        const sug = suggested[h];
        next[h] = (STANDARD_FIELDS as readonly string[]).includes(sug ?? "")
          ? (sug as StandardField)
          : "";
      }
    }
    setMapState(next);
    setMsg(`Detectadas ${grid.headers.length} columnas (${grid.rows.length} filas).`);
  }

  async function saveMappings() {
    setErr(null);
    const mappings = Object.entries(mapState)
      .filter(([, tgt]) => tgt)
      .map(([sourceColumn, targetField]) => ({ sourceColumn, targetField: targetField as string }));
    const r = await fetch(`/api/providers/${id}/mappings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappings }),
    });
    const parsed = await parseFetchJson<{ error?: unknown }>(r);
    if (!parsed.ok) {
      setErr(fetchErrorMessage(parsed) ?? JSON.stringify(parsed.data ?? {}));
      return;
    }
    setMsg("Mapeo guardado.");
    await load();
  }

  async function importFile(file: File) {
    setErr(null);
    setMsg(null);
    const ext = file.name.toLowerCase().split(".").pop();
    const kind: "FILE_CSV" | "FILE_EXCEL" =
      ext === "csv" || file.type.includes("csv") ? "FILE_CSV" : "FILE_EXCEL";

    let grid;
    try {
      const ab = await file.arrayBuffer();
      grid =
        kind === "FILE_CSV"
          ? parseCsvToGrid(new TextDecoder("utf-8").decode(ab))
          : parseXlsxToGridArrayBuffer(ab);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo leer el archivo");
      return;
    }

    if (grid.headers.length === 0) {
      setErr("No se detectaron columnas en el archivo");
      return;
    }
    if (grid.rows.length === 0) {
      setErr("El archivo no tiene filas de datos");
      return;
    }

    const batchSize = 100;
    const rowSlices: (typeof grid.rows)[] = [];
    for (let i = 0; i < grid.rows.length; i += batchSize) {
      rowSlices.push(grid.rows.slice(i, i + batchSize));
    }

    let dataSourceId: string | undefined;
    let lastTotal = 0;
    for (let i = 0; i < rowSlices.length; i++) {
      setMsg(`Importando… ${i + 1} / ${rowSlices.length}`);
      const r = await fetch(`/api/providers/${id}/import/chunk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataSourceId: dataSourceId ?? undefined,
          label: i === 0 ? `Import ${file.name}` : undefined,
          kind,
          headers: grid.headers,
          rows: rowSlices[i],
          finalize: i === rowSlices.length - 1,
        }),
      });
      const parsed = await parseFetchJson<{
        dataSourceId?: string;
        insertedChunk?: number;
        insertedTotal?: number;
        error?: string;
      }>(r);
      if (!parsed.ok || !parsed.data) {
        setErr(
          fetchErrorMessage(parsed) ??
            (typeof parsed.data?.error === "string" ? parsed.data.error : "Importación fallida"),
        );
        return;
      }
      dataSourceId = parsed.data.dataSourceId;
      lastTotal = parsed.data.insertedTotal ?? lastTotal + (parsed.data.insertedChunk ?? 0);
    }
    setMsg(`Importados ${lastTotal} productos.`);
    await load();
  }

  async function addGoogleAndSync() {
    setErr(null);
    setMsg(null);
    const r = await fetch(`/api/providers/${id}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "GOOGLE_SHEET",
        label: "Google Sheet",
        config: { spreadsheetId: sheetId.trim(), gid },
        syncNow: true,
      }),
    });
    const parsed = await parseFetchJson<{
      sync?: { inserted?: number };
      syncError?: string;
      error?: unknown;
    }>(r);
    if (!parsed.ok || !parsed.data) {
      setErr(fetchErrorMessage(parsed) ?? JSON.stringify(parsed.data ?? {}));
      return;
    }
    const j = parsed.data;
    if (j.syncError) setErr(String(j.syncError));
    else setMsg(`Sheet sincronizado: ${j.sync?.inserted ?? 0} filas.`);
    await load();
  }

  async function syncSource(sourceId: string) {
    setErr(null);
    const r = await fetch(`/api/sources/${sourceId}/sync`, { method: "POST" });
    const parsed = await parseFetchJson<{ inserted?: number; error?: string }>(r);
    if (!parsed.ok) setErr(fetchErrorMessage(parsed) ?? "Sync error");
    else setMsg(`Sincronizado: ${parsed.data?.inserted ?? 0} filas.`);
    await load();
  }

  if (!p && !err) {
    return <p className="text-slate-400">Cargando…</p>;
  }
  if (!p) {
    return (
      <p className="text-rose-400">
        {err}{" "}
        <Link href="/admin/proveedores" className="text-sky-300">
          Volver
        </Link>
      </p>
    );
  }

  const headers = Object.keys(mapState);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/proveedores" className="text-sm text-sky-300 hover:underline">
            ← Proveedores
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">{p.name}</h1>
          <p className="text-sm text-slate-400">
            {p.slug} · {p._count.products} productos
          </p>
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-rose-400">{err}</p>}

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-medium text-white">Datos generales</h2>
        <label className="block max-w-md text-sm">
          <span className="text-slate-400">Nombre</span>
          <input
            key={p.name}
            defaultValue={p.name}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            onBlur={(e) => {
              if (e.target.value !== p.name) void saveName(e.target.value);
            }}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-medium text-white">Mapeo de columnas</h2>
        <p className="text-sm text-slate-400">
          Subí un archivo de muestra para detectar encabezados. Luego asigná cada columna a un
          campo estándar (sku, name, description, brand, costPrice, listPrice, currency, stock).
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-white"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void previewFile(f);
          }}
        />
        {headers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-[520px] w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Columna origen</th>
                  <th className="py-2">Campo estándar</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h) => (
                  <tr key={h} className="border-t border-slate-800">
                    <td className="py-2 pr-4 text-slate-200">{h}</td>
                    <td className="py-2">
                      <select
                        className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        value={mapState[h] ?? ""}
                        onChange={(e) =>
                          setMapState((s) => ({
                            ...s,
                            [h]: (e.target.value || "") as StandardField | "",
                          }))
                        }
                      >
                        <option value="">— ignorar —</option>
                        {STANDARD_FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={() => void saveMappings()}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
        >
          Guardar mapeo
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-medium text-white">Importar catálogo (Excel / CSV)</h2>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-white"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
          }}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-medium text-white">Google Sheets (CSV público)</h2>
        <p className="text-sm text-slate-400">
          La hoja debe ser visible con enlace o pública. Usamos el export CSV de Google (
          <code className="text-sky-300">spreadsheetId</code> + <code className="text-sky-300">gid</code>
          ).
        </p>
        <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="ID de spreadsheet"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
          />
          <input
            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="gid"
            value={gid}
            onChange={(e) => setGid(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void addGoogleAndSync()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Conectar y sincronizar
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-medium text-white">Fuentes registradas</h2>
        {p.sources.length === 0 ? (
          <p className="text-sm text-slate-500">Ninguna aún.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {p.sources.map((s) => (
              <li
                key={s.id}
                className="flex flex-col justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <span className="font-medium text-slate-200">{s.kind}</span>
                  {s.label && <span className="text-slate-500"> — {s.label}</span>}
                  <p className="text-xs text-slate-500">
                    Última sync: {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : "—"}
                  </p>
                </div>
                {s.kind === "GOOGLE_SHEET" && (
                  <button
                    type="button"
                    onClick={() => void syncSource(s.id)}
                    className="self-start rounded-lg bg-slate-800 px-3 py-1 text-xs text-sky-200 hover:bg-slate-700"
                  >
                    Sincronizar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
