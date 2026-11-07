"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Accessible radio-card group. */
export function ChoiceGroup<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  invalid,
  columns = 3,
  describedBy,
}: {
  name: string;
  label: string;
  options: { value: T; label: string; hint?: string; icon?: React.ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  invalid?: boolean;
  columns?: 2 | 3 | 4 | 5;
  describedBy?: string;
}) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5" }[columns];
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="sr-only">{label}</legend>
      <div className={cn("grid grid-cols-1 gap-2.5", cols)}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all",
                checked ? "border-cyan/60 bg-cyan/10 shadow-[0_0_0_3px_rgb(0_217_255/0.12)]" : "border-line bg-white/[0.02] hover:border-cyan/30 hover:bg-white/[0.04]",
                invalid && !value && "border-danger/50",
              )}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="peer sr-only" />
              <span
                aria-hidden
                className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", checked ? "border-cyan" : "border-subtle")}
              >
                {checked && <span className="size-2 rounded-full bg-cyan" />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  {o.icon}
                  {o.label}
                </span>
                {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
              </span>
              <span className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-cyan" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
