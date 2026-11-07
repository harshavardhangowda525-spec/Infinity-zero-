"use client";
import * as React from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Validated categorical order for the dark surface (OKLCH L 0.48–0.67, CVD-checked). Never cycled. */
export const CHART_COLORS = ["#00A3C2", "#865DFF", "#C98420", "#4169FF", "#1FA478"] as const;
export const AXIS = { stroke: "rgb(148 163 196 / 0.25)", tick: { fill: "#94a3c4", fontSize: 11 } };
export const GRID = "rgb(148 163 196 / 0.08)";

/** Chart card with a Chart / Table toggle so every chart has an accessible table view. */
export function ChartCard({
  title,
  description,
  badge,
  table,
  children,
  empty,
  className,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  table: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  empty?: boolean;
  className?: string;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2">{title} {badge}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 rounded-lg border border-line p-0.5" role="group" aria-label={`${title} view`}>
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === "chart" ? "Chart view" : "Table view"}
              className={cn("rounded-md p-1.5", view === v ? "bg-white/10 text-ink" : "text-subtle hover:text-ink")}
            >
              {v === "chart" ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="grid h-56 place-items-center rounded-xl border border-dashed border-line text-sm text-subtle">No data in this range yet</div>
        ) : view === "chart" ? (
          <div className="h-64">{children}</div>
        ) : (
          <div className="max-h-64 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-night-2 text-xs text-subtle">
                <tr>{table.columns.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="px-3 py-2 text-muted">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TooltipBox({ active, payload, label, unit = "" }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-night-2 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-ink">{typeof p.value === "number" ? Math.round(p.value * 10) / 10 : p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}
