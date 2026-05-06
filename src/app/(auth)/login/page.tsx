"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/lib/auth/actions";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas bg-radial-glow px-4">
      <div className="absolute inset-0 bg-grid opacity-[0.5]" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-elevated">
            B
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-ink">
              BruCa Treasury
            </div>
            <div className="text-xs text-ink-3">Sistema financiero interno</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated">
          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const res = await signInAction(formData);
                if (res?.error) setError(res.error);
              });
            }}
            className="space-y-4"
          >
            <input type="hidden" name="next" value={next} />

            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue="admin@bruca.com"
                className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-ink outline-none transition-colors focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
              />
            </Field>

            <Field label="Contraseña">
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-ink outline-none transition-colors focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
              />
            </Field>

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={pending} size="lg">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ingresar
            </Button>
          </form>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-4">
          <ShieldCheck className="h-3 w-3" />
          Acceso compartido protegido por Supabase Auth
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      {children}
    </label>
  );
}
