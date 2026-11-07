"use client";
import * as React from "react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlaskConical, Ruler, Sigma } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AXIS, CHART_COLORS, ChartCard, GRID, TooltipBox } from "@/components/charts/chart-card";
import { useAppState } from "@/lib/store";
import { weeklySavedMinutes } from "@/lib/analysis";
import { SAMPLE_SCENARIOS } from "@/lib/samples";
import { formatHours, WEEKS_PER_MONTH } from "@/lib/calc";
import { FRICTION_CATEGORY_LABELS, type Analysis, type ImprovementPlan, type Measurement, type Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: Infinity },
] as const;

/** Clearly labelled illustrative data: the sample scenarios spread over recent weeks. */
function demoDataset() {
  const now = Date.now();
  const analyses: Analysis[] = [];
  const workflows: Workflow[] = [];
  SAMPLE_SCENARIOS.forEach((s, i) => {
    const createdAt = new Date(now - (i * 6 + 2) * 86400000).toISOString();
    workflows.push({ ...s.workflow, id: `demo-w-${s.id}`, createdAt });
    analyses.push({ ...s.analysis, id: `demo-a-${s.id}`, workflowId: `demo-w-${s.id}`, createdAt, source: { kind: "sample", sampleId: s.id } });
  });
  const plans: ImprovementPlan[] = [
    { id: "demo-p1", analysisId: "demo-a-gym", workflowId: "demo-w-gym", title: "Gym", status: "implemented", frictionDecisions: {}, inputs: { perWeek: 25, currentMinutes: 28, improvedMinutes: 8, implementationCost: 2, hourlyValue: null }, createdAt: analyses[0].createdAt, updatedAt: analyses[0].createdAt, implementedAt: analyses[0].createdAt },
    { id: "demo-p2", analysisId: "demo-a-freelancer", workflowId: "demo-w-freelancer", title: "Freelancer", status: "accepted", frictionDecisions: {}, inputs: { perWeek: 4, currentMinutes: 80, improvedMinutes: 27, implementationCost: 3, hourlyValue: null }, createdAt: analyses[1].createdAt, updatedAt: analyses[1].createdAt },
  ];
  const measurements: Measurement[] = [{ id: "demo-m1", planId: "demo-p1", beforeMinutes: 28, afterMinutes: 12, executionsMeasured: 10, notes: "", measuredAt: analyses[0].createdAt }];
  return { analyses, workflows, plans, measurements };
}

export default function AnalyticsPage() {
  const real = {
    analyses: useAppState((s) => s.analyses),
    workflows: useAppState((s) => s.workflows),
    plans: useAppState((s) => s.plans),
    measurements: useAppState((s) => s.measurements),
  };
  const [range, setRange] = React.useState<(typeof RANGES)[number]["id"]>("30");
  const [demo, setDemo] = React.useState(false);
  const data = React.useMemo(() => (demo ? demoDataset() : real), [demo, real.analyses, real.workflows, real.plans, real.measurements]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = RANGES.find((r) => r.id === range)!.days;
  const since = days === Infinity ? 0 : Date.now() - days * 86400000;
  const analyses = data.analyses.filter((a) => new Date(a.createdAt).getTime() >= since);
  const plans = data.plans.filter((p) => new Date(p.updatedAt).getTime() >= since);
  const measurements = data.measurements.filter((m) => new Date(m.measuredAt).getTime() >= since);

  // Analyses over time (by day)
  const byDay = new Map<string, { ai: number; sample: number }>();
  analyses.forEach((a) => {
    const d = a.createdAt.slice(0, 10);
    const e = byDay.get(d) ?? { ai: 0, sample: 0 };
    if (a.source.kind === "ai") e.ai++;
    else e.sample++;
    byDay.set(d, e);
  });
  const timeline = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({ date: new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), "AI analyses": v.ai, "Sample / demo analyses": v.sample }));

  // Friction categories
  const catCounts = new Map<string, number>();
  analyses.forEach((a) => a.frictionPoints.forEach((f) => catCounts.set(f.category, (catCounts.get(f.category) ?? 0) + 1)));
  const categories = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ name: FRICTION_CATEGORY_LABELS[c as keyof typeof FRICTION_CATEGORY_LABELS], count: n }));

  // Estimated vs measured per implemented plan
  const savings = data.plans
    .filter((p) => plans.includes(p))
    .map((p) => {
      const ms = measurements.filter((m) => m.planId === p.id);
      const measured = ms.length ? ms.reduce((n, m) => n + Math.max(0, m.beforeMinutes - m.afterMinutes), 0) / ms.length : null;
      const title = data.workflows.find((w) => w.id === p.workflowId)?.title ?? p.title;
      return {
        name: title.length > 18 ? title.slice(0, 17) + "…" : title,
        "Estimated min/week": Math.max(0, p.inputs.currentMinutes - p.inputs.improvedMinutes) * p.inputs.perWeek,
        "Measured min/week": measured === null ? 0 : measured * p.inputs.perWeek,
        hasMeasured: measured !== null,
      };
    });

  const statusCounts = (["proposed", "accepted", "rejected", "implemented"] as const).map((s, i) => ({ name: s[0].toUpperCase() + s.slice(1), value: plans.filter((p) => p.status === s).length, color: CHART_COLORS[i] })).filter((s) => s.value > 0);

  const estWeekly = analyses.reduce((n, a) => n + weeklySavedMinutes(a), 0);
  const measuredWeekly = savings.reduce((n, s) => n + s["Measured min/week"], 0);
  const empty = data.analyses.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Impact Analytics"
        title="What's changing"
        subtitle="Estimates come from analyses and your simulator assumptions. Measured savings come only from measurements you record."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line p-1" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button key={r.id} onClick={() => setRange(r.id)} aria-pressed={range === r.id} className={cn("rounded-lg px-3 py-1.5 text-xs", range === r.id ? "bg-cyan/15 text-cyan" : "text-muted hover:text-ink")}>{r.label}</button>
              ))}
            </div>
            <Button size="sm" variant={demo ? "primary" : "outline"} aria-pressed={demo} onClick={() => setDemo((d) => !d)}><FlaskConical /> {demo ? "Showing demo data" : "Preview with demo data"}</Button>
          </div>
        }
      />

      {demo && (
        <p className="mb-5 rounded-xl border border-amber/30 bg-amber/[0.07] px-4 py-3 text-sm text-muted">
          <strong className="text-amber">Demo data:</strong> illustrative sample scenarios, not real usage. Turn it off to see your own data.
        </p>
      )}
      {!demo && empty && (
        <p className="mb-5 rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-muted">
          No analyses yet. <Link href="/analyze" className="text-cyan hover:underline">Analyse a workflow</Link> or preview the dashboard with demo data.
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi icon={<Sigma className="size-4 text-cyan" />} label="Analyses in range" value={String(analyses.length)} tag={<Badge tone="neutral">Count</Badge>} />
        <Kpi icon={<Sigma className="size-4 text-violet" />} label="Estimated savings" value={`${formatHours(estWeekly * WEEKS_PER_MONTH)}/mo`} tag={<Badge tone="violet">Estimate</Badge>} />
        <Kpi icon={<Ruler className="size-4 text-success" />} label="Measured savings" value={measurements.length ? `${formatHours(measuredWeekly * WEEKS_PER_MONTH)}/mo` : "—"} tag={<Badge tone="success">Verified by you</Badge>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Workflow analyses over time" empty={timeline.length === 0} table={{ columns: ["Date", "AI", "Sample / demo"], rows: timeline.map((t) => [t.date, t["AI analyses"], t["Sample / demo analyses"]]) }}>
          <ResponsiveContainer>
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" {...AXIS} tickLine={false} />
              <YAxis allowDecimals={false} {...AXIS} tickLine={false} axisLine={false} />
              <Tooltip content={<TooltipBox />} cursor={{ stroke: "rgb(148 163 196 / 0.4)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#94a3c4" }} />
              <Area type="monotone" dataKey="AI analyses" stackId="1" stroke={CHART_COLORS[0]} strokeWidth={2} fill={CHART_COLORS[0]} fillOpacity={0.2} />
              <Area type="monotone" dataKey="Sample / demo analyses" stackId="1" stroke={CHART_COLORS[2]} strokeWidth={2} fill={CHART_COLORS[2]} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Friction categories" description="How often each category was detected" empty={categories.length === 0} table={{ columns: ["Category", "Count"], rows: categories.map((c) => [c.name, c.count]) }}>
          <ResponsiveContainer>
            <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap={6}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...AXIS} tickLine={false} />
              <YAxis type="category" dataKey="name" width={150} {...AXIS} tickLine={false} axisLine={false} />
              <Tooltip content={<TooltipBox />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
              <Bar dataKey="count" name="Friction points" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Estimated vs measured savings"
          description="Per improvement plan, minutes per week"
          badge={<><Badge tone="violet">Estimate</Badge><Badge tone="success">Measured</Badge></>}
          empty={savings.length === 0}
          table={{ columns: ["Plan", "Estimated min/week", "Measured min/week"], rows: savings.map((s) => [s.name, Math.round(s["Estimated min/week"]), s.hasMeasured ? Math.round(s["Measured min/week"]) : "not measured"]) }}
        >
          <ResponsiveContainer>
            <BarChart data={savings} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" {...AXIS} tickLine={false} />
              <YAxis {...AXIS} tickLine={false} axisLine={false} />
              <Tooltip content={<TooltipBox unit=" min" />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#94a3c4" }} />
              <Bar dataKey="Estimated min/week" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Measured min/week" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Improvement plans" description="Status of saved plans" empty={statusCounts.length === 0} table={{ columns: ["Status", "Plans"], rows: statusCounts.map((s) => [s.name, s.value]) }}>
          <ResponsiveContainer>
            <PieChart>
              <Tooltip content={<TooltipBox />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#94a3c4" }} />
              <Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="#0b1122" strokeWidth={2} label={({ value }) => value}>
                {statusCounts.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="mt-5 p-5">
        <h2 className="font-display font-semibold">Most common inefficiencies</h2>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-subtle">Nothing detected in this range yet.</p>
        ) : (
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.slice(0, 6).map((c, i) => (
              <li key={c.name} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-sm">
                <span className="grid size-6 place-items-center rounded-lg bg-cyan/10 text-xs font-semibold text-cyan">{i + 1}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-muted">{c.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tag }: { icon: React.ReactNode; label: string; value: string; tag: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted"><span className="flex items-center gap-2">{icon}{label}</span>{tag}</div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </Card>
  );
}
