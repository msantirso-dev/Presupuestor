"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchErrorMessage, parseFetchJson } from "@/lib/http/parse-fetch-json";

type Line = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  providerName: string;
  quantity: string;
  unitCost: string;
  marginPercent: string;
  lineDiscountPercent: string;
  lineSubtotal: string;
};

type Quote = {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  notes: string | null;
  issueDate: string;
  discountPercent: string;
  subtotal: string;
  total: string;
  lines: Line[];
};

export default function PresupuestoDetallePage() {
  const { id } = useParams() as { id: string };
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(`/api/quotes/${id}`);
    const parsed = await parseFetchJson<{ quote?: Quote; error?: string }>(r);
    if (!parsed.ok || !parsed.data?.quote) {
      setErr(fetchErrorMessage(parsed) ?? parsed.data?.error ?? "Error");
      setQ(null);
      return;
    }
    setQ(parsed.data.quote);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchHeader(body: {
    clientName?: string;
    notes?: string | null;
    discountPercent?: number;
  }) {
    await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function updateLine(lineId: string, body: object) {
    await fetch(`/api/quotes/${id}/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function removeLine(lineId: string) {
    await fetch(`/api/quotes/${id}/lines/${lineId}`, { method: "DELETE" });
    await load();
  }

  async function duplicate() {
    const r = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
    const parsed = await parseFetchJson<{ quote?: { id: string } }>(r);
    if (parsed.ok && parsed.data?.quote?.id) {
      window.location.href = `/presupuestos/${parsed.data.quote.id}`;
    } else {
      setErr(fetchErrorMessage(parsed) ?? "No se pudo duplicar");
    }
  }

  if (!q && !err) return <p className="text-slate-400">Cargando…</p>;
  if (!q)
    return (
      <p className="text-rose-400">
        {err}{" "}
        <Link href="/presupuestos" className="text-sky-300">
          Volver
        </Link>
      </p>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/presupuestos" className="text-sm text-sky-300 hover:underline">
            ← Lista
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">Presupuesto {q.number}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/quotes/${id}/pdf`}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          >
            Descargar PDF
          </a>
          <button
            type="button"
            onClick={() => void duplicate()}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-white"
          >
            Duplicar
          </button>
        </div>
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-400">Cliente</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            defaultValue={q.clientName}
            onBlur={(e) => {
              if (e.target.value !== q.clientName) void patchHeader({ clientName: e.target.value });
            }}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">Descuento global (%)</span>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            defaultValue={q.discountPercent}
            onBlur={(e) => {
              void patchHeader({ discountPercent: Number(e.target.value) });
            }}
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-slate-400">Notas</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            rows={2}
            defaultValue={q.notes ?? ""}
            onBlur={(e) => {
              void patchHeader({ notes: e.target.value || null });
            }}
          />
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Líneas</h2>
          <Link href="/buscar" className="text-sm text-sky-300 hover:underline">
            Buscar productos →
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Cant.</th>
                <th className="px-3 py-2">Costo u.</th>
                <th className="px-3 py-2">Margen %</th>
                <th className="px-3 py-2">Desc %</th>
                <th className="px-3 py-2">Subtotal</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {q.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Sin ítems. Agregá desde el buscador global.
                  </td>
                </tr>
              ) : (
                q.lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-800 bg-slate-950/40">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-100">{l.name}</p>
                      <p className="text-xs text-slate-500">
                        {l.providerName}
                        {l.sku ? ` · ${l.sku}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                        defaultValue={l.quantity}
                        onBlur={(e) => void updateLine(l.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-300">{l.unitCost}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                        defaultValue={l.marginPercent}
                        onBlur={(e) =>
                          void updateLine(l.id, { marginPercent: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                        defaultValue={l.lineDiscountPercent}
                        onBlur={(e) =>
                          void updateLine(l.id, { lineDiscountPercent: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-emerald-200">{l.lineSubtotal}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-xs text-rose-400 hover:underline"
                        onClick={() => void removeLine(l.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-8 text-sm">
          <span className="text-slate-400">
            Subtotal: <span className="text-white">{q.subtotal}</span>
          </span>
          <span className="text-slate-400">
            Total: <span className="text-lg font-semibold text-emerald-300">{q.total}</span>
          </span>
        </div>
      </section>
    </div>
  );
}
