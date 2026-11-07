"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Beaker, ChevronRight, Info, ListChecks, Target, Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { calculateSavings, formatHours, formatMinutes } from "@/lib/calc";
import { actions } from "@/lib/store";
import { FRICTION_CATEGORY_LABELS, type Analysis, type FrictionPoint } from "@/lib/types";
import { FrictionDetail } from "./friction-detail";
import { cap, difficultyTone, severityTone } from "./meta";
import { SourceBadge } from "./source-badge";
import type { ChainAttempt } from "./use-analyze";

export function AnalysisResult({ analysis, attempts = [], showActions = true }: { analysis: Analysis; attempts?: ChainAttempt[]; showActions?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState<FrictionPoint | null>(null);
  const s = calculateSavings({ perWeek: analysis.perWeek, currentMinutes: analysis.currentMinutes, improvedMinutes: analysis.improvedMinutes, implementationCost: 0, hourlyValue: null });
  const failed = attempts.filter((a) => !a.ok);

  return (
    <div className="space-y-5">
      {analysis.source.kind !== "ai" && (
        <div className="flex gap-3 rounded-xl border border-amber/30 bg-amber/[0.07] p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-amber" />
          <div className="text-muted">
            <strong className="text-amber">Sample Analysis.</strong>{" "}
            {analysis.source.kind === "sample"
              ? "This is a prewritten example scenario used for demonstration — it is not live AI output."
              : "No AI provider was available, so this result comes from Infinity ZERO's rule-based demo analyzer (keyword patterns), not live AI."}
            {failed.length > 0 && <span className="mt-1 block text-xs text-subtle">Tried: {failed.map((a) => `${a.provider} (${a.error})`).join(", ")}</span>}
          </div>
        </div>
      )}

      <Card glow>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Workflow summary</CardTitle>
          <SourceBadge source={analysis.source} />
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="leading-relaxed text-muted">{analysis.summary}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Current time / run" value={formatMinutes(analysis.currentMinutes)} note="your input" />
            <Metric label="Estimated improved" value={formatMinutes(analysis.improvedMinutes)} note="estimate" />
            <Metric label="Est. weekly saving" value={formatMinutes(s.weeklyMinutes)} note={`× ${analysis.perWeek}/week`} accent />
            <Metric label="Est. monthly saving" value={formatHours(s.monthlyMinutes)} note="× 4.33 weeks" accent />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Implementation difficulty:</span>
            <Badge tone={difficultyTone(analysis.difficulty)}>{cap(analysis.difficulty)}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber" /> Friction points ({analysis.frictionPoints.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.frictionPoints.length === 0 && <p className="text-sm text-muted">No friction points detected. Try adding more detail about each step.</p>}
            {analysis.frictionPoints.map((f) => (
              <button
                key={f.id}
                onClick={() => setOpen(f)}
                className="group flex w-full items-center gap-3 rounded-xl border border-line bg-white/[0.02] p-3 text-left transition-colors hover:border-cyan/40 hover:bg-white/[0.04]"
              >
                <span className={`size-2.5 shrink-0 rounded-full ${f.severity === "high" ? "bg-danger" : "bg-amber"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="text-xs text-subtle">{FRICTION_CATEGORY_LABELS[f.category]} · saves ≈ {formatMinutes(f.minutesPerExecution - f.improvedMinutes)}/run</span>
                </span>
                <Badge tone={severityTone(f.severity)} className="hidden sm:inline-flex">{cap(f.severity)}</Badge>
                <ChevronRight className="size-4 text-subtle group-hover:text-cyan" />
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-4 text-cyan" /> Recommended next action</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-ink">{analysis.nextAction}</p></CardContent>
          </Card>
          <ListCard title="Likely causes" items={analysis.causes} />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ListCard title="Potential limitations" items={analysis.limitations} />
        <ListCard title="Assumptions used" items={analysis.assumptions} />
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { actions.setActive(analysis.id); router.push("/lab"); }}>
            <Beaker /> Open Improvement Lab
          </Button>
          <Button variant="secondary" onClick={() => { actions.setActive(analysis.id); router.push("/friction"); }}>
            <Waypoints /> Explore friction
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/workflows">My Workflows <ArrowRight /></Link>
          </Button>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <SheetContent title={open.name}>
            <FrictionDetail
              f={open}
              onExplore={() => {
                actions.setActive(analysis.id, open.id);
                setOpen(null);
                router.push("/lab");
              }}
            />
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}

function Metric({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-cyan/25 bg-cyan/[0.06]" : "border-line bg-white/[0.03]"}`}>
      <div className={`font-display text-lg font-semibold ${accent ? "text-cyan" : ""}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-[10px] uppercase tracking-wider text-subtle">{note}</div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="size-4 text-violet" /> {title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted"><span className="mt-2 size-1 shrink-0 rounded-full bg-violet" />{c}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
