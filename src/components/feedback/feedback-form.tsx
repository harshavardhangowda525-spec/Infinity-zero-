"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Select, Textarea } from "@/components/ui/input";
import { ChoiceGroup } from "@/components/ui/choice";
import { feedbackSchema } from "@/lib/schema";
import { actions } from "@/lib/store";
import { PRICE_RANGES, RESPONDENT_TYPES, type FeedbackResponse, type PayIntent, type Rating, type RespondentType, type Usefulness } from "@/lib/types";
import { uid } from "@/lib/utils";

interface FormState {
  respondentType: RespondentType | null;
  experience: string;
  usefulness: Usefulness | null;
  usefulnessDetail: string;
  rating: Rating | null;
  improvementDetail: string;
  timeConsumingTask: string;
  featureWish: string;
  payIntent: PayIntent | null;
  priceRange: string | null;
}

const EMPTY: FormState = { respondentType: null, experience: "", usefulness: null, usefulnessDetail: "", rating: null, improvementDetail: "", timeConsumingTask: "", featureWish: "", payIntent: null, priceRange: null };

const reveal = { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: "auto" }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.25 } };

export function FeedbackForm({ source, defaultRespondent, onDone }: { source: FeedbackResponse["source"]; defaultRespondent?: RespondentType | null; onDone?: () => void }) {
  const [v, setV] = React.useState<FormState>({ ...EMPTY, respondentType: defaultRespondent ?? null });
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<null | "supabase" | "local">(null);
  const submissionKey = React.useRef(uid("fb")); // idempotency key: one submission per form instance

  const set = <K extends keyof FormState>(k: K, val: FormState[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || done) return;
    const payload = { ...v, submissionKey: submissionKey.current, source };
    const parsed = feedbackSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, m]) => [k, m?.[0]])));
      document.getElementById(`fb-${Object.keys(fe)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      if (data.storage === "local") {
        const d = data.data;
        actions.addLocalFeedback({ ...d, id: uid(), createdAt: new Date().toISOString(), storage: "local" });
      }
      setDone(data.storage);
      onDone?.();
    } catch (err) {
      toast.error("Couldn't send feedback", { description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="grid size-16 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-8" />
        </motion.div>
        <h2 className="font-display text-xl font-semibold">Thank you — your feedback was received.</h2>
        <p className="max-w-md text-sm text-muted">It will directly shape what Infinity ZERO builds next.</p>
        {done === "local" && <p className="max-w-md rounded-lg border border-amber/30 bg-amber/[0.07] px-3 py-2 text-xs text-muted"><strong className="text-amber">Demo mode:</strong> saved on this device only (no database configured).</p>}
      </motion.div>
    );
  }

  const showUsefulDetail = v.usefulness === "possibly" || v.usefulness === "no";
  const showImprove = v.rating === "needs_improvement";
  const showPrice = v.payIntent === "yes" || v.payIntent === "maybe";

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="fb-respondentType">I am a… <span className="font-normal text-subtle">(optional)</span></Label>
        <Select id="fb-respondentType" value={v.respondentType ?? ""} onChange={(e) => set("respondentType", (e.target.value || null) as RespondentType | null)} className="sm:w-72">
          <option value="">Prefer not to say</option>
          {RESPONDENT_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>

      <Question n={1} title="How do you like Infinity ZERO?" optional>
        <Textarea id="fb-experience" value={v.experience} onChange={(e) => set("experience", e.target.value)} placeholder="Tell us what you liked, disliked, or found interesting." aria-label="How do you like Infinity ZERO?" maxLength={2000} />
      </Question>

      <Question n={2} title="Would Infinity ZERO be useful for your work or business?" id="fb-usefulness">
        <ChoiceGroup
          name="usefulness"
          label="Would Infinity ZERO be useful for your work or business?"
          value={v.usefulness}
          onChange={(x) => set("usefulness", x)}
          invalid={!!errors.usefulness}
          describedBy="fb-usefulness-err"
          options={[
            { value: "yes", label: "Yes, definitely" },
            { value: "possibly", label: "Possibly, with some improvements" },
            { value: "no", label: "No, not currently" },
          ]}
        />
        <FieldError id="fb-usefulness-err">{errors.usefulness}</FieldError>
        <AnimatePresence initial={false}>
          {showUsefulDetail && (
            <motion.div {...reveal} className="overflow-hidden">
              <div className="space-y-2 pt-4">
                <Label htmlFor="fb-usefulnessDetail">What would make this product more useful to you?</Label>
                <Textarea id="fb-usefulnessDetail" value={v.usefulnessDetail} onChange={(e) => set("usefulnessDetail", e.target.value)} maxLength={2000} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Question>

      <Question n={3} title="How would you rate Infinity ZERO?" id="fb-rating">
        <ChoiceGroup
          name="rating"
          label="How would you rate Infinity ZERO?"
          value={v.rating}
          onChange={(x) => set("rating", x)}
          invalid={!!errors.rating}
          describedBy="fb-rating-err"
          options={[
            { value: "excellent", label: "Excellent" },
            { value: "good", label: "Good" },
            { value: "needs_improvement", label: "Needs Improvement" },
          ]}
        />
        <FieldError id="fb-rating-err">{errors.rating}</FieldError>
        <AnimatePresence initial={false}>
          {showImprove && (
            <motion.div {...reveal} className="overflow-hidden">
              <div className="space-y-2 pt-4">
                <Label htmlFor="fb-improvementDetail">What should we improve?</Label>
                <Textarea id="fb-improvementDetail" value={v.improvementDetail} onChange={(e) => set("improvementDetail", e.target.value)} aria-invalid={!!errors.improvementDetail} aria-describedby="fb-improvementDetail-err" maxLength={2000} />
                <FieldError id="fb-improvementDetail-err">{errors.improvementDetail}</FieldError>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Question>

      <details className="group rounded-2xl border border-line bg-white/[0.02] p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:hidden">
          <span className="text-cyan group-open:hidden">+ </span><span className="hidden text-cyan group-open:inline">− </span>
          A few optional research questions <span className="font-normal text-subtle">(2 minutes)</span>
        </summary>
        <div className="mt-5 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fb-timeConsumingTask">What is the most time-consuming repetitive task in your daily work?</Label>
            <Textarea id="fb-timeConsumingTask" className="min-h-20" value={v.timeConsumingTask} onChange={(e) => set("timeConsumingTask", e.target.value)} maxLength={1000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-featureWish">What is one feature you wish this application had?</Label>
            <Textarea id="fb-featureWish" className="min-h-20" value={v.featureWish} onChange={(e) => set("featureWish", e.target.value)} maxLength={1000} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Would you consider paying a monthly subscription for a product like this?</p>
            <ChoiceGroup
              name="payIntent"
              label="Would you consider paying a monthly subscription?"
              value={v.payIntent}
              onChange={(x) => set("payIntent", x)}
              options={[{ value: "yes", label: "Yes" }, { value: "maybe", label: "Maybe" }, { value: "no", label: "No" }]}
            />
            <AnimatePresence initial={false}>
              {showPrice && (
                <motion.div {...reveal} className="overflow-hidden">
                  <div className="space-y-2 pt-3">
                    <Label htmlFor="fb-priceRange">Acceptable monthly price range <span className="font-normal text-subtle">(optional)</span></Label>
                    <Select id="fb-priceRange" value={v.priceRange ?? ""} onChange={(e) => set("priceRange", e.target.value || null)} className="sm:w-72">
                      <option value="">Choose a range</option>
                      {PRICE_RANGES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}><Send /> {submitting ? "Sending…" : "Submit feedback"}</Button>
        <p className="text-xs text-subtle">Anonymous — we don't ask for your name or email.</p>
      </div>
    </form>
  );
}

function Question({ n, title, optional, children, id }: { n: number; title: string; optional?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="flex items-baseline gap-3 font-display text-base font-semibold sm:text-lg">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan/25 to-violet/25 text-sm text-cyan">{n}</span>
        <span>{title} {optional ? <span className="text-sm font-normal text-subtle">(optional)</span> : <span className="text-danger" aria-label="required">*</span>}</span>
      </h2>
      {children}
    </section>
  );
}
