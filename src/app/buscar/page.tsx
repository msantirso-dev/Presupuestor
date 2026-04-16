"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchErrorMessage, parseFetchJson } from "@/lib/http/parse-fetch-json";

type Product = {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  costPrice: string | null;
  listPrice: string | null;
  currency: string | null;
  stock: number | null;
};

type Group = { provider: { id: string; name: string; slug: string }; products: Product[] };

type QuoteListItem = { id: string; number: string; clientName: string };

export default function BuscarPage() {
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  const runSearch = useCallback(async () => {
    if (!canSearch) {
      setGroups([]);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const parsed = await parseFetchJson<{ groups?: Group[] }>(r);
      if (parsed.ok && parsed.data) {
        setGroups(parsed.data.groups ?? []);
      } else {
        setGroups([]);
        setNote(fetchErrorMessage(parsed) ?? "Error en la búsqueda");
      }
    } finally {
      setBusy(false);
    }
  }, [canSearch, q]);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch();
    }, 250);
    return () => clearTimeout(t);
  }, [runSearch]);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/quotes");
      const parsed = await parseFetchJson<{ quotes?: QuoteListItem[] }>(r);
      if (parsed.ok && parsed.data?.quotes) {
        setQuotes(parsed.data.quotes);
        if (parsed.data.quotes[0]) setQuoteId(parsed.data.quotes[0].id);
      } else {
        setQuotes([]);
      }
    })();
  }, []);

  async function addToQuote(productId: string) {
    setNote(null);
    if (!quoteId) {
      setNote("Creá un presupuesto primero en la sección Presupuestos.");
      return;
    }
    const r = await fetch(`/api/quotes/${quoteId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1, marginPercent: 0, lineDiscountPercent: 0 }),
    });
    const parsed = await parseFetchJson<{ error?: string }>(r);
    if (!parsed.ok) {
      setNote(fetchErrorMessage(parsed) ?? "No se pudo agregar");
      return;
    }
    setNote("Ítem agregado al presupuesto seleccionado.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Buscador global</h1>
        <p className="mt-1 text-sm text-slate-400">
          Consulta unificada por nombre, código, descripción o marca. Resultados agrupados por
          proveedor.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="text-slate-400">Término (mín. 2 caracteres)</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-sky-500"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej. tornillo, SKU-12, bosch…"
          />
        </label>
        <label className="w-full text-sm sm:w-64">
          <span className="text-slate-400">Agregar a presupuesto</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-white"
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
          >
            <option value="">— elegir —</option>
            {quotes.map((qu) => (
              <option key={qu.id} value={qu.id}>
                {qu.number} · {qu.clientName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {note && <p className="text-sm text-sky-300">{note}</p>}

      <div className="text-sm text-slate-500">{busy ? "Buscando…" : null}</div>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.provider.id} className="space-y-3">
            <h2 className="text-lg font-medium text-sky-100">{g.provider.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {g.products.map((pr) => (
                <article
                  key={pr.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-inner shadow-slate-950/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{pr.name}</p>
                      <p className="text-xs text-slate-500">
                        {[pr.sku && `SKU ${pr.sku}`, pr.brand].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void addToQuote(pr.id)}
                      className="shrink-0 rounded-lg bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500"
                    >
                      + Presupuesto
                    </button>
                  </div>
                  {pr.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-400">{pr.description}</p>
                  )}
                  <p className="mt-2 text-sm text-emerald-200/90">
                    Costo: {pr.costPrice ?? "—"} {pr.currency ?? ""}
                    {pr.listPrice ? ` · Lista: ${pr.listPrice}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
        {canSearch && !busy && groups.length === 0 && (
          <p className="text-slate-500">Sin resultados para &quot;{q}&quot;.</p>
        )}
      </div>
    </div>
  );
}
