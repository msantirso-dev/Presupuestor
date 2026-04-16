import Link from "next/link";

const cards = [
  {
    title: "Buscar productos",
    desc: "Consultá el catálogo normalizado de todos los proveedores activos.",
    href: "/buscar",
  },
  {
    title: "Presupuestos",
    desc: "Armá líneas con márgenes, descuentos y exportá a PDF.",
    href: "/presupuestos",
  },
  {
    title: "Admin proveedores",
    desc: "Importá Excel/CSV, conectá Google Sheets y mapeá columnas.",
    href: "/admin/proveedores",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Panel principal</h1>
        <p className="max-w-2xl text-slate-400">
          MVP con adaptadores por tipo de fuente (archivo, Google Sheets público, API stub). Los
          productos se guardan en PostgreSQL vía Prisma y el buscador consulta la tabla unificada.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-500/40 hover:bg-slate-900"
          >
            <h2 className="text-lg font-medium text-white group-hover:text-sky-200">{c.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
