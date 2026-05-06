import { cn } from "@/lib/utils";

/**
 * Logo de BruCa IA: cerebro con un café en el centro.
 * Construido como SVG inline para escalar bien y heredar `currentColor`.
 */
export function BrucaAIIcon({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {/* Brain — left lobe */}
      <path d="M16 4.5 c-2.4 0 -4 1.4 -4.4 3.2 c-1.8 0.2 -3.2 1.7 -3.2 3.6 c0 1 0.4 1.9 1.1 2.6 c-0.9 0.6 -1.5 1.6 -1.5 2.8 c0 1.3 0.7 2.4 1.7 3 c-0.4 0.6 -0.6 1.3 -0.6 2.1 c0 2.1 1.7 3.8 3.8 3.8 c0.6 0 1.2 -0.1 1.7 -0.4 c0.5 1.2 1.6 2 2.9 2 c1.8 0 3.3 -1.5 3.3 -3.3 V8.5" />
      {/* Brain — right lobe */}
      <path d="M16 4.5 c2.4 0 4 1.4 4.4 3.2 c1.8 0.2 3.2 1.7 3.2 3.6 c0 1 -0.4 1.9 -1.1 2.6 c0.9 0.6 1.5 1.6 1.5 2.8 c0 1.3 -0.7 2.4 -1.7 3 c0.4 0.6 0.6 1.3 0.6 2.1 c0 2.1 -1.7 3.8 -3.8 3.8 c-0.6 0 -1.2 -0.1 -1.7 -0.4" />
      {/* Steam (above the cup) */}
      <path d="M13.5 11.5 c-0.4 -0.6 -0.4 -1.4 0 -2" opacity="0.85" />
      <path d="M16 11.5 c-0.4 -0.6 -0.4 -1.4 0 -2" opacity="0.85" />
      <path d="M18.5 11.5 c-0.4 -0.6 -0.4 -1.4 0 -2" opacity="0.85" />
      {/* Coffee cup body */}
      <path d="M11.5 13.5 h7.5 v3.5 a2.5 2.5 0 0 1 -2.5 2.5 h-2.5 a2.5 2.5 0 0 1 -2.5 -2.5 z" />
      {/* Cup handle */}
      <path d="M19 14.5 h0.8 a1.7 1.7 0 0 1 0 3.4 h-0.8" />
      {/* Saucer */}
      <line x1="10.5" y1="20.5" x2="20" y2="20.5" />
    </svg>
  );
}
