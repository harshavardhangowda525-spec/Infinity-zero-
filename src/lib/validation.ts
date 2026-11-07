import type { FeedbackResponse, ValidationThresholds } from "./types";

export interface FeedbackStats {
  n: number;
  usefulYesPct: number;
  usefulAnyPct: number; // yes + possibly
  ratings: { excellent: number; good: number; needs_improvement: number };
  pay: { yes: number; maybe: number; no: number; unanswered: number };
  payPct: number; // yes + maybe, of those who answered
  payAnswered: number;
  priceRanges: Record<string, number>;
}

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);

export function feedbackStats(list: FeedbackResponse[]): FeedbackStats {
  const n = list.length;
  const yes = list.filter((f) => f.usefulness === "yes").length;
  const possibly = list.filter((f) => f.usefulness === "possibly").length;
  const pay = { yes: 0, maybe: 0, no: 0, unanswered: 0 };
  const priceRanges: Record<string, number> = {};
  list.forEach((f) => {
    if (f.payIntent) pay[f.payIntent]++;
    else pay.unanswered++;
    if (f.priceRange) priceRanges[f.priceRange] = (priceRanges[f.priceRange] ?? 0) + 1;
  });
  const payAnswered = pay.yes + pay.maybe + pay.no;
  return {
    n,
    usefulYesPct: pct(yes, n),
    usefulAnyPct: pct(yes + possibly, n),
    ratings: {
      excellent: list.filter((f) => f.rating === "excellent").length,
      good: list.filter((f) => f.rating === "good").length,
      needs_improvement: list.filter((f) => f.rating === "needs_improvement").length,
    },
    pay,
    payPct: pct(pay.yes + pay.maybe, payAnswered),
    payAnswered,
    priceRanges,
  };
}

export type Verdict = "Promising" | "Needs Further Validation" | "Low Interest";

/**
 * Transparent, configurable verdict. It never claims product-market fit:
 * below the minimum sample size the answer is always "Needs Further Validation".
 */
export function validationVerdict(s: FeedbackStats, t: ValidationThresholds): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  if (s.n < t.minResponses) {
    reasons.push(`Only ${s.n} of the minimum ${t.minResponses} responses collected — too few to draw a conclusion.`);
    return { verdict: "Needs Further Validation", reasons };
  }
  if (s.usefulAnyPct < t.lowInterestUsefulPct) {
    reasons.push(`${s.usefulAnyPct}% said it would be useful (yes or possibly), below the ${t.lowInterestUsefulPct}% low-interest threshold.`);
    return { verdict: "Low Interest", reasons };
  }
  const usefulOk = s.usefulYesPct >= t.promisingUsefulPct;
  const payOk = s.payAnswered > 0 && s.payPct >= t.promisingPayPct;
  reasons.push(`${s.usefulYesPct}% answered “Yes, definitely” (threshold ${t.promisingUsefulPct}%).`);
  reasons.push(s.payAnswered ? `${s.payPct}% of ${s.payAnswered} who answered would consider paying (threshold ${t.promisingPayPct}%).` : "Nobody answered the subscription question yet.");
  if (usefulOk && payOk) return { verdict: "Promising", reasons: [...reasons, "Promising is an early signal, not proof of product-market fit."] };
  return { verdict: "Needs Further Validation", reasons };
}

const STOP = new Set(
  "a an the and or but if to of in on for with at by from is are was were be been it its this that these those i me my we our you your they them their he she his her as so not no yes do does did can could would should will just more most very really also into about than then there here what which who how when where why all any some such only own same too s t don isn aren wasn weren app application product feature features something things thing like want wish make need get use using have has had one".split(
    " ",
  ),
);

/** Simple, transparent word-frequency over free-text answers (no AI). */
export function topTerms(texts: string[], limit = 10): { term: string; count: number }[] {
  const counts = new Map<string, number>();
  texts.forEach((t) => {
    const seen = new Set<string>();
    t.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .forEach((w) => {
        if (!seen.has(w)) {
          seen.add(w);
          counts.set(w, (counts.get(w) ?? 0) + 1);
        }
      });
  });
  return [...counts.entries()]
    .filter(([, c]) => c >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s; // guard against spreadsheet formula injection
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadCSV(name: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
