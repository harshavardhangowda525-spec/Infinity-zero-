"use client";
import { ArrowRight, Clock, Gauge, Lightbulb, Quote, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMinutes, WEEKS_PER_MONTH } from "@/lib/calc";
import { FRICTION_CATEGORY_LABELS, type FrictionPoint } from "@/lib/types";
import { cap, confidenceTone, difficultyTone, severityTone } from "./meta";

export function FrictionDetail({ f, onExplore }: { f: FrictionPoint; onExplore?: () => void }) {
  const saved = Math.max(0, f.minutesPerExecution - f.improvedMinutes);
  const weekly = saved * f.frequencyPerWeek;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="royal">{FRICTION_CATEGORY_LABELS[f.category]}</Badge>
        <Badge tone={severityTone(f.severity)}>{cap(f.severity)} severity</Badge>
        <Badge tone={confidenceTone(f.confidence)}>{cap(f.confidence)} confidence</Badge>
      </div>
      <p className="text-sm text-muted">{f.description}</p>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Gauge className="size-4 text-amber" /> Why is this slowing you down?</h3>
        <p className="text-sm leading-relaxed text-muted">{f.why}</p>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-cyan" /> What can be improved?</h3>
        <p className="text-sm leading-relaxed text-muted">{f.improvement}</p>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Wrench className="size-4 text-violet" /> How difficult is the improvement?</h3>
        <Badge tone={difficultyTone(f.difficulty)}>{cap(f.difficulty)}</Badge>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock className="size-4 text-success" /> How much time might be saved?</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Per run", formatMinutes(saved)],
            ["Per week", formatMinutes(weekly)],
            ["Per month", formatMinutes(weekly * WEEKS_PER_MONTH)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-white/[0.03] p-3">
              <div className="font-display text-base font-semibold text-ink">{v}</div>
              <div className="text-[11px] text-subtle">{k}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-subtle">
          Estimate: {formatMinutes(f.minutesPerExecution)} → {formatMinutes(f.improvedMinutes)} per run × {f.frequencyPerWeek}/week. Not a measured result.
        </p>
      </section>
      <section className="rounded-xl border border-line bg-white/[0.03] p-3">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle"><Quote className="size-3.5" /> Evidence</h3>
        <p className="text-sm text-muted">{f.evidence}</p>
      </section>
      {onExplore && (
        <Button className="w-full" onClick={onExplore}>
          Explore Solution <ArrowRight />
        </Button>
      )}
    </div>
  );
}
