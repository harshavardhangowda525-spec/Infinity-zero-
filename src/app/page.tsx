"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Lightbulb, PlayCircle, ScanSearch } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowDiagram, DiagramLegend } from "@/components/workflow/workflow-diagram";
import { SourceBadge } from "@/components/workflow/source-badge";
import { useAppState, useHydrated } from "@/lib/store";
import { useActiveAnalysis, sampleAnalysis } from "@/lib/hooks";
import { weeklySavedMinutes } from "@/lib/analysis";
import { formatHours, formatMinutes, WEEKS_PER_MONTH } from "@/lib/calc";
import { FRICTION_CATEGORY_LABELS, type WorkflowStep } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function OverviewPage() {
  const hydrated = useHydrated();
  const { analysis: latest, analyses, workflows } = useActiveAnalysis();
  const plans = useAppState((s) => s.plans);
  const measurements = useAppState((s) => s.measurements);
  const analysis = latest ?? sampleAnalysis();
  const [selected, setSelected] = React.useState<WorkflowStep | null>(null);
  React.useEffect(() => setSelected(analysis.beforeSteps.find((s) => s.friction) ?? analysis.beforeSteps[0]), [analysis.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const latestPerWorkflow = React.useMemo(() => {
    const seen = new Set<string>();
    return analyses.filter((a) => (seen.has(a.workflowId) ? false : (seen.add(a.workflowId), true)));
  }, [analyses]);
  const frictionCount = latestPerWorkflow.reduce((n, a) => n + a.frictionPoints.length, 0);
  const estWeekly = latestPerWorkflow.reduce((n, a) => n + weeklySavedMinutes(a), 0);
  const implemented = plans.filter((p) => p.status === "implemented").length;
  const measuredWeekly = React.useMemo(() => {
    return measurements.reduce((n, m) => {
      const plan = plans.find((p) => p.id === m.planId);
      return n + Math.max(0, m.beforeMinutes - m.afterMinutes) * (plan?.inputs.perWeek ?? 0);
    }, 0);
  }, [measurements, plans]);

  const f = selected ? analysis.frictionPoints.find((x) => x.id === selected.frictionId) : undefined;

  const metrics = [
    { label: "Workflows Analyzed", value: String(workflows.length), sub: workflows.length ? "Submitted by you" : "None yet", icon: Activity, tone: "text-cyan" },
    { label: "Friction Points Identified", value: String(frictionCount), sub: "Across your latest analyses", icon: AlertTriangle, tone: "text-amber" },
    { label: "Estimated Time Savings", value: formatHours(estWeekly * WEEKS_PER_MONTH), sub: "per month · estimate, not measured", icon: Clock, tone: "text-violet" },
    {
      label: "Improvements Implemented",
      value: String(implemented),
      sub: measurements.length ? `Measured: ${formatHours(measuredWeekly * WEEKS_PER_MONTH)}/month saved` : "Confirmed by you · no measurements yet",
      icon: CheckCircle2,
      tone: "text-success",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Zero Command Center"
        title={<>Welcome to <span className="text-gradient">Infinity ZERO</span></>}
        subtitle="Discover what's slowing you down. Transform how you work."
        actions={
          <>
            <Button variant="secondary" asChild><Link href="/demo"><PlayCircle /> Live Demo</Link></Button>
            <Button asChild size="lg"><Link href="/analyze"><ScanSearch /> Analyze My Workflow</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
            <Card className="h-full p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted sm:text-sm">{m.label}</p>
                <m.icon className={`size-4 shrink-0 ${m.tone}`} />
              </div>
              {hydrated ? <p className="mt-3 font-display text-2xl font-bold sm:text-3xl">{m.value}</p> : <Skeleton className="mt-3 h-8 w-20" />}
              <p className="mt-1 text-[11px] text-subtle sm:text-xs">{m.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card glow className="mt-6">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Workflow intelligence</CardTitle>
            <CardDescription>
              {latest ? <>Your latest analysis: <span className="text-ink">{workflows.find((w) => w.id === latest.workflowId)?.title ?? "Workflow"}</span> · {formatDate(latest.createdAt)}</> : "An example workflow — analyse your own to see it here."} Select a step to inspect it.
            </CardDescription>
          </div>
          <SourceBadge source={analysis.source} />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-x-auto pb-2">
            <WorkflowDiagram steps={analysis.beforeSteps} frictionPoints={analysis.frictionPoints} selectedId={selected?.id} onSelect={setSelected} />
          </div>
          <DiagramLegend />
          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 rounded-xl border border-line bg-white/[0.03] p-4 md:grid-cols-[1fr_1fr]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-semibold">{selected.name}</h3>
                  {selected.friction ? <Badge tone={f?.severity === "high" ? "danger" : "amber"}>Friction</Badge> : <Badge tone="cyan">Efficient</Badge>}
                </div>
                <p className="text-sm text-muted">{selected.description}</p>
                <p className="text-sm"><span className="text-subtle">Estimated duration:</span> {formatMinutes(selected.minutes)}</p>
              </div>
              <div className="space-y-3 text-sm">
                {f ? (
                  <>
                    <p><span className="font-medium text-amber">Friction: </span><span className="text-muted">{f.why}</span></p>
                    <p className="flex gap-2"><Lightbulb className="mt-0.5 size-4 shrink-0 text-cyan" /><span className="text-muted">{f.improvement}</span></p>
                    <p className="text-xs text-subtle">{FRICTION_CATEGORY_LABELS[f.category]}</p>
                  </>
                ) : (
                  <p className="text-muted">No friction detected in this step — it already looks efficient.</p>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { href: "/demo", title: "Run the 3-minute demo", body: "Situation → workflow → analysis → improvement → feedback.", icon: PlayCircle },
          { href: "/lab", title: "Simulate improvements", body: "Adjust assumptions and see estimated savings update live.", icon: Clock },
          { href: "/feedback", title: "Share your feedback", body: "Tell us whether Infinity ZERO would help your work.", icon: CheckCircle2 },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="glass group rounded-2xl p-5 transition-colors hover:border-cyan/40">
            <x.icon className="size-5 text-cyan" />
            <h3 className="mt-3 font-display font-semibold">{x.title}</h3>
            <p className="mt-1 text-sm text-muted">{x.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm text-cyan">Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
