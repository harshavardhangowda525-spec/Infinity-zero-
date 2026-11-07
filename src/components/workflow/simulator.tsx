"use client";
import * as React from "react";
import { Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input, Label } from "@/components/ui/input";
import { calculateSavings, formatHours, formatINR, formatMinutes } from "@/lib/calc";
import type { SimulatorInputs } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Simulator({ value, onChange, compact }: { value: SimulatorInputs; onChange: (v: SimulatorInputs) => void; compact?: boolean }) {
  const r = calculateSavings(value);
  const set = (patch: Partial<SimulatorInputs>) => onChange({ ...value, ...patch });
  const improvedTooHigh = value.improvedMinutes > value.currentMinutes;

  return (
    <div className={cn("grid gap-6", !compact && "lg:grid-cols-[1fr_1fr]")}>
      <div className="space-y-5">
        <Slider id="sim-freq" label="Workflow frequency" unit="/ week" value={value.perWeek} min={0} max={100} step={0.5} onChange={(v) => set({ perWeek: v })} />
        <Slider id="sim-cur" label="Current time per run" unit="min" value={value.currentMinutes} min={1} max={240} step={0.5} onChange={(v) => set({ currentMinutes: v })} />
        <Slider id="sim-imp" label="Estimated improved time" unit="min" value={value.improvedMinutes} min={0} max={240} step={0.5} onChange={(v) => set({ improvedMinutes: v })} />
        {improvedTooHigh && <p className="text-xs text-amber">Improved time is higher than current time, so no saving is calculated.</p>}
        <Slider id="sim-cost" label="Implementation effort (one-off)" unit="hours" value={value.implementationCost} min={0} max={40} step={0.5} onChange={(v) => set({ implementationCost: v })} />
        <div className="space-y-2">
          <Label htmlFor="sim-hourly" className="text-muted font-normal">Your hourly value (optional)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-subtle">₹</span>
            <Input
              id="sim-hourly"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Leave blank to skip money estimates"
              value={value.hourlyValue ?? ""}
              onChange={(e) => set({ hourlyValue: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3" aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Saved per run" value={formatMinutes(r.savedPerExecution)} />
          <Stat label="Saved per week" value={formatMinutes(r.weeklyMinutes)} />
          <Stat label="Saved per month" value={formatHours(r.monthlyMinutes)} highlight />
          <Stat label="Break-even" value={r.breakEvenWeeks === null ? "—" : r.breakEvenWeeks < 1 ? "< 1 week" : `${r.breakEvenWeeks.toFixed(1)} weeks`} />
          {r.weeklyValue !== null && <Stat label="Value per week" value={formatINR(r.weeklyValue)} />}
          {r.monthlyValue !== null && <Stat label="Value per month" value={formatINR(r.monthlyValue)} highlight />}
        </div>
        <div className="flex gap-2 rounded-xl border border-violet/25 bg-violet/5 p-3 text-xs text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-violet" />
          <p>
            Estimates only, not guaranteed outcomes. Saved per run = current − improved. Weekly = per run × frequency. Monthly = weekly × 4.33.
            {r.weeklyValue === null && " Money values appear only when you enter an hourly value."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", highlight ? "border-cyan/30 bg-gradient-to-br from-cyan/10 to-royal/5" : "border-line bg-white/[0.03]")}>
      <div className={cn("font-display text-xl font-semibold", highlight ? "text-cyan" : "text-ink")}>{value}</div>
      <div className="mt-0.5 text-xs text-subtle">{label}</div>
    </div>
  );
}
