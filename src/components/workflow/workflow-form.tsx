"use client";
import * as React from "react";
import { Plus, ScanSearch, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Hint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { workflowInputSchema, type WorkflowInput } from "@/lib/schema";
import { BUSINESS_CATEGORIES } from "@/lib/types";
import { SAMPLE_SCENARIOS, type SampleScenario } from "@/lib/samples";

const EMPTY: WorkflowInput = { title: "", category: "", description: "", perWeek: 5, avgMinutes: 30, steps: [], notes: "" };

export function sampleToInput(s: SampleScenario): WorkflowInput {
  const w = s.workflow;
  return { title: w.title, category: w.category, description: w.description, perWeek: w.perWeek, avgMinutes: w.avgMinutes, steps: [], notes: "" };
}

export function WorkflowForm({
  onSubmit,
  loading,
  samples = SAMPLE_SCENARIOS,
  compact,
}: {
  onSubmit: (v: WorkflowInput, sampleId?: string) => void;
  loading?: boolean;
  samples?: SampleScenario[];
  compact?: boolean;
}) {
  const [v, setV] = React.useState<WorkflowInput>(EMPTY);
  const [sampleId, setSampleId] = React.useState<string | undefined>();
  const [errors, setErrors] = React.useState<Partial<Record<keyof WorkflowInput, string>>>({});
  const [showOptional, setShowOptional] = React.useState(false);

  const set = <K extends keyof WorkflowInput>(k: K, val: WorkflowInput[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (k === "description") setSampleId((id) => (id && samples.find((s) => s.id === id)?.workflow.description === val ? id : undefined));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const loadSample = (s: SampleScenario) => {
    setV(sampleToInput(s));
    setSampleId(s.id);
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = v.steps.map((s) => s.trim()).filter(Boolean);
    const parsed = workflowInputSchema.safeParse({ ...v, steps });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, m]) => [k, m?.[0]])) as typeof errors);
      document.getElementById(`wf-${Object.keys(fe)[0]}`)?.focus();
      return;
    }
    onSubmit(parsed.data, sampleId);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="rounded-xl border border-line bg-white/[0.02] p-3">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted"><Wand2 className="size-3.5 text-violet" /> Start from a sample scenario</p>
        <div className="flex flex-wrap gap-2">
          {samples.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => loadSample(s)}
              aria-pressed={sampleId === s.id}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${sampleId === s.id ? "border-violet/60 bg-violet/15 text-ink" : "border-line text-muted hover:border-violet/40 hover:text-ink"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {sampleId && <p className="mt-2 text-xs text-amber">Sample loaded — results will be labelled “Sample Analysis”. Edit the description to analyse your own version.</p>}
      </div>

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <Label htmlFor="wf-title">Workflow title</Label>
          <Input id="wf-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Customer enquiry to quotation" aria-invalid={!!errors.title} aria-describedby="wf-title-err" />
          <FieldError id="wf-title-err">{errors.title}</FieldError>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wf-category">Business category</Label>
          <Select id="wf-category" value={v.category} onChange={(e) => set("category", e.target.value)} aria-invalid={!!errors.category} aria-describedby="wf-category-err">
            <option value="">Choose a category</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {v.category && !BUSINESS_CATEGORIES.includes(v.category as never) && <option value={v.category}>{v.category}</option>}
          </Select>
          <FieldError id="wf-category-err">{errors.category}</FieldError>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wf-description">Describe your current workflow</Label>
        <Textarea
          id="wf-description"
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          rows={compact ? 4 : 5}
          placeholder="Whenever a customer contacts my business, I manually reply to their enquiry, prepare a quotation, send it through WhatsApp, and follow up after two days."
          aria-invalid={!!errors.description}
          aria-describedby="wf-description-hint wf-description-err"
        />
        <Hint id="wf-description-hint">Mention where you repeat, copy, search, wait or chase — that's where friction hides.</Hint>
        <FieldError id="wf-description-err">{errors.description}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wf-perWeek">Times per week</Label>
          <Input id="wf-perWeek" type="number" min={0.25} step={0.25} inputMode="decimal" value={v.perWeek} onChange={(e) => set("perWeek", e.target.value === "" ? ("" as never) : Number(e.target.value))} aria-invalid={!!errors.perWeek} aria-describedby="wf-perWeek-err" />
          <FieldError id="wf-perWeek-err">{errors.perWeek}</FieldError>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wf-avgMinutes">Avg. minutes per run</Label>
          <Input id="wf-avgMinutes" type="number" min={1} inputMode="decimal" value={v.avgMinutes} onChange={(e) => set("avgMinutes", e.target.value === "" ? ("" as never) : Number(e.target.value))} aria-invalid={!!errors.avgMinutes} aria-describedby="wf-avgMinutes-err" />
          <FieldError id="wf-avgMinutes-err">{errors.avgMinutes}</FieldError>
        </div>
      </div>

      <div>
        <button type="button" onClick={() => setShowOptional((s) => !s)} aria-expanded={showOptional} className="text-sm text-cyan hover:underline">
          {showOptional ? "Hide" : "Add"} individual steps & notes (optional)
        </button>
        {showOptional && (
          <div className="mt-3 space-y-4 rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="space-y-2">
              <Label>Workflow steps</Label>
              {v.steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input aria-label={`Step ${i + 1}`} value={s} onChange={(e) => set("steps", v.steps.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Step ${i + 1}`} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove step ${i + 1}`} onClick={() => set("steps", v.steps.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {v.steps.length < 20 && (
                <Button type="button" variant="outline" size="sm" onClick={() => set("steps", [...v.steps, ""])}>
                  <Plus /> Add step
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-notes">Notes</Label>
              <Textarea id="wf-notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Tools you use, constraints, anything else relevant" />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
        <ScanSearch /> {loading ? "Analysing…" : "Analyze Workflow"}
      </Button>
    </form>
  );
}
