import type { SimulatorInputs } from "./types";

export const WEEKS_PER_MONTH = 4.33;

export interface SavingsResult {
  savedPerExecution: number; // minutes
  weeklyMinutes: number;
  monthlyMinutes: number;
  weeklyValue: number | null; // ₹, only when hourly value provided
  monthlyValue: number | null;
  breakEvenWeeks: number | null; // weeks until setup effort is recovered
}

const clamp0 = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Savings formulas (all outputs are estimates):
 *  Time saved per execution = current − improved
 *  Weekly = per execution × weekly frequency
 *  Monthly = weekly × 4.33
 * Money is only calculated when the user explicitly gives an hourly value.
 */
export function calculateSavings(i: SimulatorInputs): SavingsResult {
  const savedPerExecution = clamp0(i.currentMinutes - i.improvedMinutes);
  const weeklyMinutes = savedPerExecution * clamp0(i.perWeek);
  const monthlyMinutes = weeklyMinutes * WEEKS_PER_MONTH;
  const hasValue = i.hourlyValue !== null && i.hourlyValue > 0;
  const weeklyValue = hasValue ? (weeklyMinutes / 60) * (i.hourlyValue as number) : null;
  const monthlyValue = hasValue ? (monthlyMinutes / 60) * (i.hourlyValue as number) : null;
  const breakEvenWeeks =
    weeklyMinutes > 0 && i.implementationCost > 0
      ? (i.implementationCost * 60) / weeklyMinutes
      : null;
  return { savedPerExecution, weeklyMinutes, monthlyMinutes, weeklyValue, monthlyValue, breakEvenWeeks };
}

export function formatMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "0 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatHours(min: number): string {
  const h = min / 60;
  return `${h >= 10 ? Math.round(h) : h.toFixed(1)} h`;
}

export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
