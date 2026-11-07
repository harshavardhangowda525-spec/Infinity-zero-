"use client";
import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Briefcase, Building2, GraduationCap, Laptop, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkflowForm } from "@/components/workflow/workflow-form";
import { Analyzing } from "@/components/workflow/analyzing";
import { AnalysisResult } from "@/components/workflow/analysis-result";
import { BeforeAfter } from "@/components/workflow/before-after";
import { Simulator } from "@/components/workflow/simulator";
import { useAnalyze } from "@/components/workflow/use-analyze";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { SAMPLE_SCENARIOS, type SampleScenario } from "@/lib/samples";
import type { Analysis, RespondentType, SimulatorInputs } from "@/lib/types";
import { cn } from "@/lib/utils";

const SITUATIONS: { id: SampleScenario["situation"]; label: string; respondent: RespondentType; icon: React.ElementType; hint: string }[] = [
  { id: "business", label: "I own a business", respondent: "Business owner", icon: Building2, hint: "Enquiries, bookings, follow-ups" },
  { id: "freelancer", label: "I am a freelancer", respondent: "Freelancer", icon: Laptop, hint: "Quotes, approvals, invoices" },
  { id: "student", label: "I am a student", respondent: "Student", icon: GraduationCap, hint: "Notes, assignments, revision" },
  { id: "employee", label: "I am an employee", respondent: "Employee", icon: Briefcase, hint: "Reports, updates, approvals" },
];

const STEPS = ["Your situation", "Your workflow", "Analysis", "Improvement", "Benefits", "Feedback"];

export default function LiveDemoPage() {
  const [step, setStep] = React.useState(0);
  const [situation, setSituation] = React.useState<(typeof SITUATIONS)[number] | null>(null);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [inputs, setInputs] = React.useState<SimulatorInputs | null>(null);
  const [feedbackSent, setFeedbackSent] = React.useState(false);
  const { run, loading, attempts } = useAnalyze();
  const top = React.useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    setStep(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const samples = situation ? [...SAMPLE_SCENARIOS].sort((a, b) => Number(b.situation === situation.id) - Number(a.situation === situation.id)) : SAMPLE_SCENARIOS;
  const canNext = [Boolean(situation), Boolean(analysis), Boolean(analysis), Boolean(analysis), Boolean(inputs), false][step];

  const restart = () => {
    setStep(0); setSituation(null); setAnalysis(null); setInputs(null); setFeedbackSent(false);
  };

  return (
    <div ref={top} className="mx-auto max-w-5xl scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Live Demo · no sign-up</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">See Infinity ZERO in 3 minutes</h1>
        </div>
        {step > 0 && <Button variant="ghost" size="sm" onClick={restart}><RotateCcw /> Restart</Button>}
      </div>

      <ol className="mb-6 grid grid-cols-6 gap-1.5" aria-label="Demo progress">
        {STEPS.map((s, i) => (
          <li key={s} className="min-w-0">
            <div className={cn("h-1.5 rounded-full transition-colors duration-500", i <= step ? "bg-gradient-to-r from-cyan to-royal" : "bg-white/10")} />
            <p className={cn("mt-1.5 hidden truncate text-[11px] sm:block", i === step ? "text-ink" : "text-subtle")} aria-current={i === step ? "step" : undefined}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>
      <p className="mb-4 text-sm text-muted sm:hidden">Step {step + 1} of 6 · {STEPS[step]}</p>

      <AnimatePresence mode="wait">
        <motion.div key={step + (loading ? "-l" : "")} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          {step === 0 && (
            <div>
              <h2 className="mb-4 font-display text-lg font-semibold">Which best describes you?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {SITUATIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSituation(s); go(1); }}
                    aria-pressed={situation?.id === s.id}
                    className={cn("glass group flex items-center gap-4 rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:border-cyan/40", situation?.id === s.id && "border-cyan/60")}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20 text-cyan"><s.icon className="size-6" /></span>
                    <span>
                      <span className="block font-display font-semibold">{s.label}</span>
                      <span className="text-sm text-muted">{s.hint}</span>
                    </span>
                    <ArrowRight className="ml-auto size-4 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-cyan" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (loading ? <Analyzing /> : (
            <Card><CardContent className="p-5 sm:p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">Describe a task you repeat often</h2>
              <p className="mb-5 text-sm text-muted">Type your own, or pick a sample to see how it works.</p>
              <WorkflowForm
                samples={samples}
                loading={loading}
                onSubmit={async (v, sampleId) => {
                  const r = await run(v, sampleId);
                  if (r) {
                    setAnalysis(r.analysis);
                    setInputs({ perWeek: r.analysis.perWeek, currentMinutes: r.analysis.currentMinutes, improvedMinutes: r.analysis.improvedMinutes, implementationCost: 2, hourlyValue: null });
                    go(2);
                  }
                }}
              />
            </CardContent></Card>
          ))}

          {step === 2 && analysis && <AnalysisResult analysis={analysis} attempts={attempts} showActions={false} />}

          {step === 3 && analysis && (
            <Card glow><CardContent className="p-5 sm:p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">Your workflow, before and after</h2>
              <p className="mb-5 text-sm text-muted">Amber/red steps carry friction. Press “Play transformation” to see the change.</p>
              <BeforeAfter analysis={analysis} />
            </CardContent></Card>
          )}

          {step === 4 && inputs && (
            <Card><CardContent className="p-5 sm:p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">Estimate the benefit</h2>
              <p className="mb-5 text-sm text-muted">Change any assumption — results update instantly.</p>
              <Simulator value={inputs} onChange={setInputs} />
            </CardContent></Card>
          )}

          {step === 5 && (
            <Card glow><CardContent className="p-5 sm:p-8">
              {!feedbackSent && (
                <div className="mb-6">
                  <h2 className="font-display text-xl font-semibold">Help Shape the Future of Infinity ZERO</h2>
                  <p className="mt-1 text-sm text-muted">Your feedback will help us build a product that solves real problems.</p>
                </div>
              )}
              <FeedbackForm source="live_demo" defaultRespondent={situation?.respondent} onDone={() => setFeedbackSent(true)} />
              {feedbackSent && (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" onClick={restart}><RotateCcw /> Run demo again</Button>
                  <Button variant="ghost" asChild><Link href="/pricing">See proposed pricing</Link></Button>
                </div>
              )}
            </CardContent></Card>
          )}
        </motion.div>
      </AnimatePresence>

      {!loading && step > 0 && !(step === 5 && feedbackSent) && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => go(step - 1)}><ArrowLeft /> Back</Button>
          {step >= 2 && step < 5 && <Button onClick={() => go(step + 1)} disabled={!canNext}>{step === 4 ? "Share feedback" : "Next"} <ArrowRight /></Button>}
        </div>
      )}
    </div>
  );
}
