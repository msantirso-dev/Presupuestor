"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchErrorMessage, parseFetchJson } from "@/lib/http/parse-fetch-json";

type Provider = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { products: number; sources: number };
};

export default function ProveedoresPage() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/providers");
      const parsed = await parseFetchJson<{ providers?: Provider[]; error?: string }>(r);
      if (!parsed.ok || !parsed.data?.providers) {
        throw new Error(fetchErrorMessage(parsed) ?? "Error");
      }
      setRows(parsed.data.providers);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const parsed = await parseFetchJson<{ error?: unknown }>(r);
    if (!parsed.ok) {
      setErr(fetchErrorMessage(parsed) ?? JSON.stringify(parsed.data ?? {}));
      return;
    }
    setName("");
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Proveedores</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cada proveedor tiene fuentes de datos (archivo, Google Sheet, API) y mapeo de columnas
          hacia el modelo estándar.
        </p>
      </div>

      <form onSubmit={create} className="flex max-w-xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="text-slate-400">Nombre</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-sky-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Distribuidora Norte"
            required
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Crear
        </button>
      </form>

      {err && <p className="text-sm text-rose-400">{err}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Productos</th>
              <th className="px-4 py-3">Fuentes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No hay proveedores todavía.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-800 bg-slate-950/40">
                  <td className="px-4 py-3 text-white">{p.name}</td>
                  <td className="px-4 py-3 text-slate-400">{p.slug}</td>
                  <td className="px-4 py-3">{p._count.products}</td>
                  <td className="px-4 py-3">{p._count.sources}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/proveedores/${p.id}`}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs text-sky-200 hover:bg-slate-700"
                    >
                      Administrar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
