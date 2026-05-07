"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InvestorsFilters({
  active,
}: {
  active: { q: string; status: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(patch: Partial<{ q: string; status: string }>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all" || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`?${next.toString()}`);
  }

  const hasFilters = active.q !== "" || active.status !== "all";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <input
            placeholder="Buscar por nombre, email o documento…"
            value={active.q}
            onChange={(e) => update({ q: e.target.value })}
            className="h-9 w-full rounded-md border border-border bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-ink-3">Estado</span>
          <select
            value={active.status}
            onChange={(e) => update({ status: e.target.value })}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(window.location.pathname)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-2"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </CardContent>
    </Card>
  );
}
