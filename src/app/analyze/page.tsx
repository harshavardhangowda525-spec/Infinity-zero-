"use client";
import * as React from "react";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkflowForm } from "@/components/workflow/workflow-form";
import { Analyzing } from "@/components/workflow/analyzing";
import { AnalysisResult } from "@/components/workflow/analysis-result";
import { useAnalyze } from "@/components/workflow/use-analyze";
import { useStatus } from "@/components/layout/providers";
import type { Analysis } from "@/lib/types";

export default function AnalyzePage() {
  const { run, loading, attempts } = useAnalyze();
  const [result, setResult] = React.useState<Analysis | null>(null);
  const status = useStatus();

  return (
    <div>
      <PageHeader
        eyebrow="Workflow Analysis Engine"
        title="Analyze a workflow"
        subtitle="Describe how a recurring task works today. Infinity ZERO identifies friction, likely causes and practical improvements — using only the time values you provide."
        actions={result && !loading ? <Button variant="secondary" onClick={() => setResult(null)}><RotateCcw /> New analysis</Button> : undefined}
      />
      {status.loaded && status.aiProviders.length === 0 && !result && (
        <p className="mb-4 rounded-xl border border-amber/25 bg-amber/[0.06] px-4 py-3 text-sm text-muted">
          <strong className="text-amber">Demo mode:</strong> no AI provider key is configured, so custom workflows get a rule-based <em>Sample Analysis</em>. Add a free Groq / Gemini / OpenRouter / Cerebras key to enable live AI.
        </p>
      )}
      {loading ? (
        <Analyzing />
      ) : result ? (
        <AnalysisResult analysis={result} attempts={attempts} />
      ) : (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <WorkflowForm
              loading={loading}
              onSubmit={async (v, sampleId) => {
                const r = await run(v, sampleId);
                if (r) {
                  setResult(r.analysis);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
