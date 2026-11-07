"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  className?: string;
}

/** Range slider with a paired numeric input, so values are keyboard- and screen-reader-friendly. */
export function Slider({ id, label, value, min, max, step = 1, unit, onChange, className }: SliderProps) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            aria-label={`${label} value`}
            value={Number.isFinite(value) ? value : ""}
            min={min}
            step={step}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
            className="h-8 w-20 rounded-lg border border-line bg-night-2/70 px-2 text-right text-sm text-ink focus:border-cyan/60 focus:outline-none"
          />
          {unit && <span className="text-xs text-subtle">{unit}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${pct}%` }}
        className="w-full"
      />
    </div>
  );
}
