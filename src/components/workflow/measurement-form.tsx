"use client";
import * as React from "react";
import { toast } from "sonner";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { actions } from "@/lib/store";
import { formatMinutes } from "@/lib/calc";
import type { Measurement } from "@/lib/types";
import { formatDate, uid } from "@/lib/utils";

export function MeasurementForm({ planId, defaultBefore, measurements }: { planId: string; defaultBefore: number; measurements: Measurement[] }) {
  const [before, setBefore] = React.useState(String(defaultBefore));
  const [after, setAfter] = React.useState("");
  const [runs, setRuns] = React.useState("5");
  const [notes, setNotes] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = Number(before), a = Number(after), r = Number(runs);
    if (!(b > 0) || !(a >= 0) || after === "" || !(r >= 1)) {
      setErr("Enter your measured before and after minutes, and how many runs you timed (at least 1).");
      return;
    }
    actions.addMeasurement({ id: uid(), planId, beforeMinutes: b, afterMinutes: a, executionsMeasured: Math.round(r), notes: notes.trim(), measuredAt: new Date().toISOString() });
    setAfter("");
    setNotes("");
    setErr(null);
    toast.success("Measurement recorded", { description: "Shown as a measured result in Impact Analytics." });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate className="space-y-3">
        <p className="text-sm text-muted">Time the workflow yourself a few times after implementing, and record the averages. These become <strong className="text-success">measured</strong> results — separate from estimates.</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label htmlFor="m-before" className="text-xs">Before (min/run)</Label><Input id="m-before" type="number" min={0} value={before} onChange={(e) => setBefore(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="m-after" className="text-xs">After (min/run)</Label><Input id="m-after" type="number" min={0} value={after} onChange={(e) => setAfter(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="m-runs" className="text-xs">Runs timed</Label><Input id="m-runs" type="number" min={1} value={runs} onChange={(e) => setRuns(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="m-notes" className="text-xs">Notes (optional)</Label><Textarea id="m-notes" rows={2} className="min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <FieldError>{err}</FieldError>
        <Button type="submit" variant="success"><Ruler /> Record measurement</Button>
      </form>
      {measurements.length > 0 && (
        <ul className="space-y-2">
          {measurements.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/20 bg-success/[0.05] px-3 py-2 text-sm">
              <span>{formatMinutes(m.beforeMinutes)} → {formatMinutes(m.afterMinutes)} <span className="text-subtle">({m.executionsMeasured} runs)</span></span>
              <span className="text-xs text-subtle">{formatDate(m.measuredAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
