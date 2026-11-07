"use client";
import * as React from "react";
import { toast } from "sonner";
import { actions } from "@/lib/store";
import type { WorkflowInput } from "@/lib/schema";
import type { Analysis, Workflow } from "@/lib/types";

export interface ChainAttempt { provider: string; ok: boolean; error?: string }

export function useAnalyze() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attempts, setAttempts] = React.useState<ChainAttempt[]>([]);

  const run = React.useCallback(async (input: WorkflowInput, sampleId?: string): Promise<{ analysis: Analysis; workflow: Workflow } | null> => {
    setLoading(true);
    setError(null);
    try {
      const minDelay = new Promise((r) => setTimeout(r, 1400)); // let the processing state be readable
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: input, sampleId }),
      });
      const data = await res.json();
      await minDelay;
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      const analysis = data.analysis as Analysis;
      const workflow: Workflow = { ...input, id: data.workflowId, createdAt: analysis.createdAt, sampleId };
      actions.saveAnalysis(workflow, analysis);
      setAttempts(data.attempts ?? []);
      toast.success(analysis.source.kind === "ai" ? "Analysis complete" : "Sample analysis ready", {
        description: analysis.source.kind === "ai" ? `Analysed by ${analysis.source.provider}` : "Demonstration result — not live AI analysis.",
      });
      return { analysis, workflow };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error("Couldn't analyse the workflow", { description: msg });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, attempts };
}
