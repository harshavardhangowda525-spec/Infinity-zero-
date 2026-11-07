"use client";

import { useSyncExternalStore } from "react";
import type {
  Analysis,
  FeedbackResponse,
  ImprovementPlan,
  Measurement,
  PricingInterest,
  ValidationThresholds,
  Workflow,
} from "./types";
import { DEFAULT_THRESHOLDS } from "./types";

/**
 * Client-side application store.
 * - Guests: everything lives in this browser's localStorage (labelled "Demo mode / this device").
 * - Signed-in users (Supabase configured): workflow writes are also synced to the server via /api/workflows.
 */

export interface Settings {
  hourlyValue: number | null;
  motion: "system" | "reduced" | "full";
  thresholds: ValidationThresholds;
}

export interface AppState {
  version: 1;
  workflows: Workflow[];
  analyses: Analysis[];
  plans: ImprovementPlan[];
  measurements: Measurement[];
  feedback: FeedbackResponse[]; // only used when Supabase isn't configured
  pricingInterest: PricingInterest[]; // only used when Supabase isn't configured
  settings: Settings;
  activeAnalysisId: string | null;
  focusFrictionId: string | null;
}

const KEY = "infinity-zero:v1";

const initial: AppState = {
  version: 1,
  workflows: [],
  analyses: [],
  plans: [],
  measurements: [],
  feedback: [],
  pricingInterest: [],
  settings: { hourlyValue: null, motion: "system", thresholds: DEFAULT_THRESHOLDS },
  activeAnalysisId: null,
  focusFrictionId: null,
};

let state: AppState = initial;
let hydrated = false;
let cloudSync = false;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initial,
      ...parsed,
      settings: { ...initial.settings, ...parsed.settings, thresholds: { ...DEFAULT_THRESHOLDS, ...parsed.settings?.thresholds } },
    };
  } catch {
    return initial;
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked — keep working in memory
  }
}

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    state = load();
    hydrated = true;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        state = load();
        listeners.forEach((l) => l());
      }
    });
  }
}

export function setState(updater: (s: AppState) => AppState) {
  ensureHydrated();
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  ensureHydrated();
  return state;
}

function subscribe(l: () => void) {
  ensureHydrated();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(initial),
  );
}

/** True once the browser store has loaded (avoids flashing empty states during SSR). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/* ---------------------------- cloud sync ----------------------------- */

export function setCloudSync(on: boolean) {
  cloudSync = on;
}
export function isCloudSync() {
  return cloudSync;
}

async function syncPost(body: unknown) {
  if (!cloudSync) return;
  const res = await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const { toast } = await import("sonner");
    toast.error("Saved on this device, but syncing to your account failed. It will stay available here.");
  }
}

export async function loadFromCloud() {
  const res = await fetch("/api/workflows");
  if (!res.ok) return;
  const data = (await res.json()) as Pick<AppState, "workflows" | "analyses" | "plans" | "measurements">;
  setState((s) => ({
    ...s,
    workflows: mergeById(s.workflows, data.workflows),
    analyses: mergeById(s.analyses, data.analyses),
    plans: mergeById(s.plans, data.plans),
    measurements: mergeById(s.measurements, data.measurements),
  }));
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map(local.map((x) => [x.id, x]));
  remote.forEach((x) => map.set(x.id, x));
  return [...map.values()];
}

/* ------------------------------ actions ------------------------------ */

const s_plan = (id: string) => getState().plans.find((p) => p.id === id);

export const actions = {
  saveAnalysis(workflow: Workflow, analysis: Analysis) {
    setState((s) => ({
      ...s,
      workflows: [workflow, ...s.workflows.filter((w) => w.id !== workflow.id)],
      analyses: [analysis, ...s.analyses.filter((a) => a.id !== analysis.id)],
      activeAnalysisId: analysis.id,
    }));
    void syncPost({ type: "analysis", workflow, analysis });
  },
  setActive(analysisId: string | null, focusFrictionId: string | null = null) {
    setState((s) => ({ ...s, activeAnalysisId: analysisId, focusFrictionId }));
  },
  savePlan(plan: ImprovementPlan) {
    setState((s) => ({ ...s, plans: [plan, ...s.plans.filter((p) => p.id !== plan.id)] }));
    if (!plan.analysisId.startsWith("sample-")) void syncPost({ type: "plan", plan });
  },
  addMeasurement(m: Measurement) {
    setState((s) => ({ ...s, measurements: [m, ...s.measurements] }));
    const plan = s_plan(m.planId);
    if (plan && !plan.analysisId.startsWith("sample-")) void syncPost({ type: "measurement", measurement: m });
  },
  deleteWorkflow(workflowId: string) {
    setState((s) => {
      const analysisIds = new Set(s.analyses.filter((a) => a.workflowId === workflowId).map((a) => a.id));
      const planIds = new Set(s.plans.filter((p) => analysisIds.has(p.analysisId)).map((p) => p.id));
      return {
        ...s,
        workflows: s.workflows.filter((w) => w.id !== workflowId),
        analyses: s.analyses.filter((a) => !analysisIds.has(a.id)),
        plans: s.plans.filter((p) => !planIds.has(p.id)),
        measurements: s.measurements.filter((m) => !planIds.has(m.planId)),
        activeAnalysisId: s.activeAnalysisId && analysisIds.has(s.activeAnalysisId) ? null : s.activeAnalysisId,
      };
    });
    void syncPost({ type: "deleteWorkflow", workflowId });
  },
  addLocalFeedback(f: FeedbackResponse) {
    setState((s) =>
      s.feedback.some((x) => x.submissionKey === f.submissionKey) ? s : { ...s, feedback: [f, ...s.feedback] },
    );
  },
  addLocalPricingInterest(p: PricingInterest) {
    setState((s) => ({ ...s, pricingInterest: [p, ...s.pricingInterest] }));
  },
  updateSettings(patch: Partial<Settings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  clearWorkData() {
    setState((s) => ({ ...s, workflows: [], analyses: [], plans: [], measurements: [], activeAnalysisId: null, focusFrictionId: null }));
  },
  clearLocalFeedback() {
    setState((s) => ({ ...s, feedback: [], pricingInterest: [] }));
  },
};
