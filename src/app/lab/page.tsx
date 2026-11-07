"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, CheckCircle2, Rocket, Save, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BeforeAfter } from "@/components/workflow/before-after";
import { Simulator } from "@/components/workflow/simulator";
import { AnalysisPicker } from "@/components/workflow/analysis-picker";
import { SourceBadge } from "@/components/workflow/source-badge";
import { MeasurementForm } from "@/components/workflow/measurement-form";
import { cap, difficultyTone } from "@/components/workflow/meta";
import { useActiveAnalysis, sampleAnalysis } from "@/lib/hooks";
import { actions, useAppState } from "@/lib/store";
import { formatMinutes } from "@/lib/calc";
import type { Analysis, ImprovementPlan, SimulatorInputs, WorkflowStep } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

type Decision = "accepted" | "rejected";

function improvedFor(a: Analysis, d: Record<string, Decision>) {
  const saved = a.frictionPoints.filter((f) => d[f.id] !== "rejected").reduce((n, f) => n + (f.minutesPerExecution - f.improvedMinutes), 0);
  return Math.max(0, Math.round((a.currentMinutes - saved) * 10) / 10);
}

export default function ImprovementLabPage() {
  const { analysis: active, analyses, workflows, focusFrictionId } = useActiveAnalysis();
  const analysis = active ?? sampleAnalysis();
  const plans = useAppState((s) => s.plans);
  const measurements = useAppState((s) => s.measurements);
  const hourly = useAppState((s) => s.settings.hourlyValue);
  const plan = plans.find((p) => p.analysisId === analysis.id);
  const title = workflows.find((w) => w.id === analysis.workflowId)?.title ?? "Sample workflow";

  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({});
  const [inputs, setInputs] = React.useState<SimulatorInputs>({ perWeek: 1, currentMinutes: 1, improvedMinutes: 0, implementationCost: 2, hourlyValue: null });
  const [selected, setSelected] = React.useState<{ step: WorkflowStep; side: "before" | "after" } | null>(null);

  // Reset local state whenever the analysis changes.
  React.useEffect(() => {
    const d = plan?.frictionDecisions ?? {};
    setDecisions(d);
    setInputs(plan?.inputs ?? { perWeek: analysis.perWeek, currentMinutes: analysis.currentMinutes, improvedMinutes: improvedFor(analysis, d), implementationCost: 2, hourlyValue: hourly });
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.id]);

  const decide = (id: string, value: Decision) => {
    const next = { ...decisions, [id]: value };
    setDecisions(next);
    setInputs((i) => ({ ...i, improvedMinutes: improvedFor(analysis, next) }));
  };

  const save = (status: ImprovementPlan["status"]) => {
    const now = new Date().toISOString();
    const p: ImprovementPlan = {
      id: plan?.id ?? uid(),
      analysisId: analysis.id,
      workflowId: analysis.workflowId,
      title,
      status,
      frictionDecisions: decisions,
      inputs,
      createdAt: plan?.createdAt ?? now,
      updatedAt: now,
      implementedAt: status === "implemented" ? plan?.implementedAt ?? now : plan?.implementedAt,
    };
    actions.savePlan(p);
    if (inputs.hourlyValue !== null && inputs.hourlyValue !== hourly) actions.updateSettings({ hourlyValue: inputs.hourlyValue });
    toast.success(status === "implemented" ? "Marked as implemented" : "Improvement plan saved", {
      description: status === "implemented" ? "Record a measurement below to track the actual result." : "Find it in My Workflows.",
    });
  };

  const selectedFriction = selected?.step.frictionId ? analysis.frictionPoints.find((f) => f.id === selected.step.frictionId) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Improvement Lab"
        title="Before → After"
        subtitle="Inspect each step, accept or reject recommendations, and simulate the effect with your own assumptions."
        actions={<AnalysisPicker analysis={analysis} analyses={analyses} workflows={workflows} />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SourceBadge source={analysis.source} />
        {plan && <Badge tone={plan.status === "implemented" ? "success" : "cyan"}>Plan: {cap(plan.status)}</Badge>}
      </div>

      <Card glow>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Select any step to inspect it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-1">
            <BeforeAfter analysis={analysis} selectedId={selected?.step.id} onSelectStep={(step, side) => setSelected({ step, side })} />
          </div>
          {selected && (
            <motion.div key={selected.step.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-line bg-white/[0.03] p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={selected.side === "before" ? "amber" : "success"}>{selected.side === "before" ? "Current step" : "Improved step"}</Badge>
                <h3 className="font-semibold">{selected.step.name}</h3>
                <span className="text-subtle">≈ {formatMinutes(selected.step.minutes)}</span>
              </div>
              <p className="mt-2 text-muted">{selected.step.description}</p>
              {selectedFriction && <p className="mt-2 text-muted"><span className="text-cyan">Recommendation: </span>{selectedFriction.improvement}</p>}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Rejected items are excluded from the improved-time estimate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.frictionPoints.length === 0 && <p className="text-sm text-muted">This analysis has no recommendations.</p>}
            {analysis.frictionPoints.map((f) => {
              const d = decisions[f.id];
              return (
                <div
                  key={f.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    f.id === focusFrictionId ? "border-cyan/60 bg-cyan/[0.06] shadow-[0_0_0_3px_rgb(0_217_255/0.1)]" : "border-line bg-white/[0.02]",
                    d === "rejected" && "opacity-55",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="mt-1 text-xs text-muted">{f.improvement}</p>
                    </div>
                    <Badge tone={difficultyTone(f.difficulty)} className="shrink-0">{cap(f.difficulty)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-xs text-subtle">{formatMinutes(f.minutesPerExecution)} → {formatMinutes(f.improvedMinutes)} / run</span>
                    <Button size="sm" variant={d === "accepted" ? "success" : "outline"} aria-pressed={d === "accepted"} onClick={() => decide(f.id, "accepted")}><Check /> Accept</Button>
                    <Button size="sm" variant={d === "rejected" ? "danger" : "outline"} aria-pressed={d === "rejected"} onClick={() => decide(f.id, "rejected")}><X /> Reject</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Improvement simulator</CardTitle>
            <CardDescription>Starts from your stated time and the accepted recommendations. Adjust anything.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Simulator value={inputs} onChange={setInputs} />
            <div className="flex flex-wrap gap-2 border-t border-line pt-5">
              <Button onClick={() => save(plan?.status === "implemented" ? "implemented" : "accepted")}><Save /> Save improvement plan</Button>
              {plan?.status !== "implemented" && <Button variant="success" onClick={() => save("implemented")}><Rocket /> Mark as implemented</Button>}
              {analysis.source.kind === "sample" && <p className="w-full text-xs text-subtle">You're working on a sample scenario — plans are saved on this device only. <Link href="/analyze" className="text-cyan hover:underline">Analyse your own workflow</Link>.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {plan?.status === "implemented" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Measure the actual result (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <MeasurementForm planId={plan.id} defaultBefore={plan.inputs.currentMinutes} measurements={measurements.filter((m) => m.planId === plan.id)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
