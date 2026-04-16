"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchErrorMessage, parseFetchJson } from "@/lib/http/parse-fetch-json";

type Quote = {
  id: string;
  number: string;
  clientName: string;
  total: string;
  issueDate: string;
};

export default function PresupuestosPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await fetch("/api/quotes");
    const parsed = await parseFetchJson<{ quotes?: Quote[] }>(r);
    const msg = fetchErrorMessage(parsed);
    if (!parsed.ok || !parsed.data) {
      setRows([]);
      setErr(msg ?? "No se pudo cargar la lista");
      setLoading(false);
      return;
    }
    setRows(parsed.data.quotes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setErr(null);
    const r = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: "Nuevo cliente" }),
    });
    const parsed = await parseFetchJson<{ quote?: { id: string } }>(r);
    const msg = fetchErrorMessage(parsed);
    if (!parsed.ok || !parsed.data?.quote) {
      setErr(msg ?? "No se pudo crear el presupuesto");
      return;
    }
    window.location.href = `/presupuestos/${parsed.data.quote.id}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Presupuestos</h1>
          <p className="text-sm text-slate-400">Creá, editá, duplicá y exportá a PDF.</p>
        </div>
        <button
          type="button"
          onClick={() => void create()}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Nuevo presupuesto
        </button>
      </div>

      {err && (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          {err}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Fecha</th>
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
                  No hay presupuestos.
                </td>
              </tr>
            ) : (
              rows.map((q) => (
                <tr key={q.id} className="border-t border-slate-800 bg-slate-950/40">
                  <td className="px-4 py-3 font-mono text-sky-200">{q.number}</td>
                  <td className="px-4 py-3 text-white">{q.clientName}</td>
                  <td className="px-4 py-3">{q.total}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(q.issueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/presupuestos/${q.id}`}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs text-sky-200 hover:bg-slate-700"
                    >
                      Abrir
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
