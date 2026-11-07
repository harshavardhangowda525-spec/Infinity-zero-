"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/calc";
import type { Analysis, WorkflowStep } from "@/lib/types";
import { WorkflowDiagram } from "./workflow-diagram";
import { cn } from "@/lib/utils";

/** Side-by-side (desktop) or stacked (mobile) comparison with an animated "transform" toggle. */
export function BeforeAfter({ analysis, onSelectStep, selectedId }: { analysis: Analysis; onSelectStep?: (s: WorkflowStep, side: "before" | "after") => void; selectedId?: string | null }) {
  const [view, setView] = React.useState<"split" | "before" | "after">("split");
  const [transformKey, setTransformKey] = React.useState(0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Comparison view">
        {(["split", "before", "after"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", view === v ? "bg-cyan/15 text-cyan" : "text-muted hover:bg-white/5 hover:text-ink")}
          >
            {v === "split" ? "Compare" : v === "before" ? "Before" : "After"}
          </button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            setView("before");
            setTimeout(() => {
              setView("after");
              setTransformKey((k) => k + 1);
            }, 700);
          }}
        >
          <Sparkles /> Play transformation
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view + transformKey}
          initial={{ opacity: 0, filter: "blur(6px)", scale: 0.98 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(6px)", scale: 0.98 }}
          transition={{ duration: 0.35 }}
          className={cn("grid gap-4", view === "split" && "xl:grid-cols-1")}
        >
          {(view === "split" || view === "before") && (
            <Panel title="Before" subtitle={`≈ ${formatMinutes(analysis.currentMinutes)} per run`} tone="before">
              <WorkflowDiagram steps={analysis.beforeSteps} frictionPoints={analysis.frictionPoints} selectedId={selectedId} onSelect={onSelectStep ? (s) => onSelectStep(s, "before") : undefined} />
            </Panel>
          )}
          {view === "split" && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <ArrowDown className="size-4 text-cyan md:hidden" />
              <ArrowRight className="hidden size-4 text-cyan md:block" />
              Saves ≈ {formatMinutes(Math.max(0, analysis.currentMinutes - analysis.improvedMinutes))} per run (estimate)
            </div>
          )}
          {(view === "split" || view === "after") && (
            <Panel title="After" subtitle={`≈ ${formatMinutes(analysis.improvedMinutes)} per run`} tone="after">
              <WorkflowDiagram improved steps={analysis.afterSteps} selectedId={selectedId} onSelect={onSelectStep ? (s) => onSelectStep(s, "after") : undefined} />
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Panel({ title, subtitle, tone, children }: { title: string; subtitle: string; tone: "before" | "after"; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", tone === "before" ? "border-amber/20 bg-amber/[0.03]" : "border-success/20 bg-success/[0.03]")}>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className={cn("font-display text-sm font-semibold uppercase tracking-widest", tone === "before" ? "text-amber" : "text-success")}>{title}</h3>
        <span className="text-xs text-muted">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}
