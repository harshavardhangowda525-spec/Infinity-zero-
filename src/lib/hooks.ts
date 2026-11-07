"use client";
import * as React from "react";
import { useAppState } from "./store";
import { getSample, OVERVIEW_SAMPLE_ID } from "./samples";
import type { Analysis } from "./types";

export function useActiveAnalysis() {
  const analyses = useAppState((s) => s.analyses);
  const workflows = useAppState((s) => s.workflows);
  const activeId = useAppState((s) => s.activeAnalysisId);
  const focusFrictionId = useAppState((s) => s.focusFrictionId);
  return React.useMemo(() => {
    const analysis =
      (activeId?.startsWith("sample-") ? sampleAnalysis(activeId.slice(7)) : analyses.find((a) => a.id === activeId)) ?? analyses[0] ?? null;
    const workflow = analysis ? workflows.find((w) => w.id === analysis.workflowId) ?? null : null;
    return { analysis, workflow, analyses, workflows, focusFrictionId };
  }, [analyses, workflows, activeId, focusFrictionId]);
}

/** A stable, clearly-labelled sample analysis for showing the product before the user has data. */
const sampleCache = new Map<string, Analysis>();

export function sampleAnalysis(id = OVERVIEW_SAMPLE_ID): Analysis {
  const s = getSample(id) ?? getSample(OVERVIEW_SAMPLE_ID)!;
  const cached = sampleCache.get(s.id);
  if (cached) return cached;
  const a: Analysis = { ...s.analysis, id: `sample-${s.id}`, workflowId: `sample-${s.id}`, createdAt: "2026-01-01T00:00:00.000Z", source: { kind: "sample", sampleId: s.id } };
  sampleCache.set(s.id, a);
  return a;
}
