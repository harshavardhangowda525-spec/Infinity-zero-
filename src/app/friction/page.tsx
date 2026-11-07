"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FrictionDetail } from "@/components/workflow/friction-detail";
import { AnalysisPicker } from "@/components/workflow/analysis-picker";
import { SourceBadge } from "@/components/workflow/source-badge";
import { cap, confidenceTone, difficultyTone, severityTone } from "@/components/workflow/meta";
import { useActiveAnalysis, sampleAnalysis } from "@/lib/hooks";
import { actions } from "@/lib/store";
import { formatMinutes } from "@/lib/calc";
import { FRICTION_CATEGORIES, FRICTION_CATEGORY_LABELS, type FrictionPoint, type Level } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIFF_COL = { easy: 0, moderate: 1, hard: 2 } as const;
const SEV_ROW = { high: 0, medium: 1, low: 2 } as const;

export default function FrictionExplorerPage() {
  const router = useRouter();
  const { analysis: active, analyses, workflows } = useActiveAnalysis();
  const analysis = active ?? sampleAnalysis();
  const [category, setCategory] = React.useState<string>("all");
  const [severity, setSeverity] = React.useState<Level | "all">("all");
  const [open, setOpen] = React.useState<FrictionPoint | null>(null);

  const list = analysis.frictionPoints.filter((f) => (category === "all" || f.category === category) && (severity === "all" || f.severity === severity));

  const explore = (f: FrictionPoint) => {
    actions.setActive(analysis.id, f.id);
    setOpen(null);
    router.push("/lab");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Interactive Friction Explorer"
        title="Where your effort leaks"
        subtitle="Each friction point is mapped by severity and how hard it is to fix. Start top-left: high impact, easy wins."
        actions={<AnalysisPicker analysis={analysis} analyses={analyses} workflows={workflows} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SourceBadge source={analysis.source} />
        <span className="flex items-center gap-2 text-sm text-muted"><Filter className="size-4" /> Filter</span>
        <Select aria-label="Filter by category" className="h-9 w-auto min-w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {FRICTION_CATEGORIES.map((c) => <option key={c} value={c}>{FRICTION_CATEGORY_LABELS[c]}</option>)}
        </Select>
        <Select aria-label="Filter by severity" className="h-9 w-auto" value={severity} onChange={(e) => setSeverity(e.target.value as Level | "all")}>
          <option value="all">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card glow>
          <CardHeader>
            <CardTitle>Impact × effort map</CardTitle>
            <CardDescription>Rows: severity. Columns: implementation difficulty. Select a point to inspect it.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5 text-xs">
              <span />
              {["Easy", "Moderate", "Hard"].map((d) => <span key={d} className="pb-1 text-center text-subtle">{d}</span>)}
              {(["high", "medium", "low"] as const).map((sev) => (
                <React.Fragment key={sev}>
                  <span className="flex items-center pr-2 text-subtle [writing-mode:vertical-rl] rotate-180 sm:[writing-mode:horizontal-tb] sm:rotate-0">{cap(sev)}</span>
                  {(["easy", "moderate", "hard"] as const).map((diff) => {
                    const cell = list.filter((f) => SEV_ROW[f.severity] === SEV_ROW[sev] && DIFF_COL[f.difficulty] === DIFF_COL[diff]);
                    const quickWin = sev === "high" && diff === "easy";
                    return (
                      <div key={diff} className={cn("flex min-h-24 flex-wrap content-start gap-1.5 rounded-xl border p-2", quickWin ? "border-success/30 bg-success/[0.05]" : "border-line bg-white/[0.02]")}>
                        {quickWin && cell.length === 0 && <span className="text-[10px] text-success/70">Quick wins</span>}
                        {cell.map((f, i) => (
                          <motion.button
                            key={f.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => setOpen(f)}
                            className={cn(
                              "max-w-full truncate rounded-lg border px-2 py-1 text-left text-[11px] font-medium",
                              f.severity === "high" ? "border-danger/40 bg-danger/15 text-ink" : f.severity === "medium" ? "border-amber/40 bg-amber/15 text-ink" : "border-line bg-white/10 text-ink",
                            )}
                            title={f.name}
                          >
                            {f.name}
                          </motion.button>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {list.length === 0 && <Card className="p-6 text-sm text-muted">No friction points match these filters.</Card>}
          {list.map((f, i) => (
            <motion.button
              key={f.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setOpen(f)}
              className="glass w-full rounded-2xl p-4 text-left transition-colors hover:border-cyan/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{f.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{f.description}</p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-lg font-semibold text-cyan">{formatMinutes((f.minutesPerExecution - f.improvedMinutes) * f.frequencyPerWeek)}</span>
                  <span className="text-[10px] text-subtle">est. / week</span>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="royal">{FRICTION_CATEGORY_LABELS[f.category]}</Badge>
                <Badge tone={severityTone(f.severity)}>{cap(f.severity)}</Badge>
                <Badge tone={difficultyTone(f.difficulty)}>{cap(f.difficulty)} fix</Badge>
                <Badge tone={confidenceTone(f.confidence)}>{cap(f.confidence)} confidence</Badge>
                <Badge>{f.frequencyPerWeek}×/week</Badge>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <SheetContent title={open.name}>
            <FrictionDetail f={open} onExplore={() => explore(open)} />
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
