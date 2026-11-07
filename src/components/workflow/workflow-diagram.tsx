"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/calc";
import type { FrictionPoint, WorkflowStep } from "@/lib/types";

function Connector({ variant, vertical }: { variant: "friction" | "clean"; vertical?: boolean }) {
  const color = variant === "friction" ? "#ffb547" : "#00d9ff";
  return vertical ? (
    <svg aria-hidden className="mx-auto h-6 w-3 shrink-0" viewBox="0 0 12 24">
      <line x1="6" y1="0" x2="6" y2="24" stroke={color} strokeOpacity="0.7" strokeWidth="2" strokeDasharray="4 4" className="animate-flow" />
    </svg>
  ) : (
    <svg aria-hidden className="h-3 w-full min-w-6 shrink" viewBox="0 0 48 12" preserveAspectRatio="none">
      <line x1="0" y1="6" x2="48" y2="6" stroke={color} strokeOpacity="0.7" strokeWidth="2" strokeDasharray="4 4" className="animate-flow" />
    </svg>
  );
}

/**
 * Interactive workflow diagram. Friction steps are amber/red, clean steps cyan.
 * Horizontal on wide screens, vertical stack on mobile.
 */
export function WorkflowDiagram({
  steps,
  frictionPoints = [],
  selectedId,
  onSelect,
  improved,
}: {
  steps: WorkflowStep[];
  frictionPoints?: FrictionPoint[];
  selectedId?: string | null;
  onSelect?: (step: WorkflowStep) => void;
  improved?: boolean;
}) {
  const fp = (s: WorkflowStep) => frictionPoints.find((f) => f.id === s.frictionId);
  return (
    <ol className="flex flex-col md:flex-row md:items-center" aria-label={improved ? "Improved workflow" : "Current workflow"}>
      {steps.map((s, i) => {
        const f = fp(s);
        const high = f?.severity === "high";
        const selected = selectedId === s.id;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <>
                <span className="md:hidden">
                  <Connector vertical variant={s.friction ? "friction" : "clean"} />
                </span>
                <span className="hidden flex-1 md:flex">
                  <Connector variant={s.friction ? "friction" : "clean"} />
                </span>
              </>
            )}
            <motion.li
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="md:w-36 md:shrink-0 lg:w-40"
            >
              <button
                type="button"
                onClick={() => onSelect?.(s)}
                aria-pressed={selected}
                disabled={!onSelect}
                className={cn(
                  "relative flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:cursor-default",
                  s.friction
                    ? high
                      ? "border-danger/40 bg-danger/10 hover:border-danger/70"
                      : "border-amber/40 bg-amber/10 hover:border-amber/70"
                    : improved
                      ? "border-success/35 bg-success/10 hover:border-success/60"
                      : "border-cyan/30 bg-cyan/[0.07] hover:border-cyan/60",
                  selected && "ring-2 ring-cyan shadow-[0_0_30px_-6px_rgb(0_217_255/0.6)]",
                )}
              >
                {s.friction && (
                  <span className={cn("absolute -right-1.5 -top-1.5 size-3 rounded-full animate-pulse-soft", high ? "bg-danger" : "bg-amber")} aria-hidden />
                )}
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-subtle">
                  {s.friction ? (
                    <AlertTriangle className={cn("size-3.5", high ? "text-danger" : "text-amber")} />
                  ) : (
                    <CheckCircle2 className={cn("size-3.5", improved ? "text-success" : "text-cyan")} />
                  )}
                  Step {i + 1}
                </span>
                <span className="text-sm font-medium leading-snug text-ink">{s.name}</span>
                <span className="text-xs text-muted">≈ {formatMinutes(s.minutes)}</span>
                <span className="sr-only">{s.friction ? `Friction: ${f?.severity ?? ""} severity` : "No friction detected"}</span>
              </button>
            </motion.li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export function DiagramLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-danger" /> High friction</span>
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber" /> Friction</span>
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-cyan" /> Efficient step</span>
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-success" /> Improved step</span>
    </div>
  );
}
