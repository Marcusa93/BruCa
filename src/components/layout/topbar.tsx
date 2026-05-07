"use client";

import { Search, Command, Menu } from "lucide-react";
import { PushToggle } from "@/components/push/push-toggle";

interface TopbarProps {
  onMenu?: () => void;
}

export function Topbar({ onMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={onMenu}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
          <input
            placeholder="Buscar inversor, colocación, contraparte…"
            className="h-9 w-full rounded-md border border-border bg-surface-2 pl-9 pr-16 text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
          />
          <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-3 md:flex">
            <Command className="h-2.5 w-2.5" />K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden h-9 items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5 text-xs font-medium sm:flex">
          <button className="rounded-[5px] bg-surface px-2.5 py-1 text-ink shadow-card">
            ARS
          </button>
          <button className="px-2.5 py-1 text-ink-3 hover:text-ink">USD</button>
        </div>
        <PushToggle />
      </div>
    </header>
  );
}
