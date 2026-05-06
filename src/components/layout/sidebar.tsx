"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  CalendarClock,
  Calculator,
  Users,
  Sparkles,
  Coins,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { href: "/inversiones", label: "Inversiones", icon: TrendingUp, group: "Operación" },
  { href: "/colocaciones", label: "Colocaciones", icon: Wallet, group: "Operación" },
  { href: "/vencimientos", label: "Vencimientos", icon: CalendarClock, group: "Operación" },
  { href: "/tesoreria", label: "Tesorería", icon: Coins, group: "Operación" },
  { href: "/inversores", label: "Inversores", icon: Users, group: "Cartera" },
  { href: "/simulador", label: "Simulador", icon: Calculator, group: "Cartera" },
  { href: "/asistente", label: "Asistente IA", icon: Sparkles, group: "Inteligencia" },
];

interface SidebarProps {
  userEmail?: string;
  /** Mobile drawer open state. */
  open?: boolean;
  /** Callback to close the drawer (mobile). */
  onClose?: () => void;
}

export function Sidebar({ userEmail, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const groups = Array.from(new Set(NAV.map((n) => n.group).filter(Boolean) as string[]));

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out",
          "lg:sticky lg:top-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white shadow-card">
            B
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-ink">BruCa</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-4">
              Treasury System
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">
                {group}
              </div>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === group).map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-brand-50 text-brand-800"
                            : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-600" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-brand-700" : "text-ink-3",
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="rounded-md border border-border bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
                {(userEmail ?? "BR").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-xs font-medium text-ink">
                  {userEmail ?? "BruCa"}
                </span>
                <span className="text-[10px] text-ink-4">Acceso compartido</span>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Cerrar sesión"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface hover:text-danger"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
