"use client";
import * as React from "react";
import { Select } from "@/components/ui/input";
import { SAMPLE_SCENARIOS } from "@/lib/samples";
import { actions } from "@/lib/store";
import type { Analysis, Workflow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/** Pick which analysis to view: the user's own analyses, or a labelled sample scenario. */
export function AnalysisPicker({ analysis, analyses, workflows }: { analysis: Analysis | null; analyses: Analysis[]; workflows: Workflow[] }) {
  return (
    <div className="w-full sm:w-80">
      <label htmlFor="analysis-picker" className="sr-only">Choose a workflow analysis</label>
      <Select id="analysis-picker" value={analysis?.id ?? ""} onChange={(e) => actions.setActive(e.target.value || null)}>
        {analyses.length > 0 && (
          <optgroup label="Your analyses">
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>
                {(workflows.find((w) => w.id === a.workflowId)?.title ?? "Workflow") + " · " + formatDate(a.createdAt)}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Sample scenarios (demo)">
          {SAMPLE_SCENARIOS.map((s) => (
            <option key={s.id} value={`sample-${s.id}`}>Sample · {s.label}</option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}
