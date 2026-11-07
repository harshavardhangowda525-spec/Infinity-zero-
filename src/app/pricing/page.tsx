"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, CheckCircle2, Info, Minus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { pricingInterestSchema } from "@/lib/schema";
import { actions } from "@/lib/store";
import { RESPONDENT_TYPES, type PlanId, type RespondentType } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const PLANS: { id: PlanId; name: string; price: string; tagline: string; cta: string; featured?: boolean }[] = [
  { id: "free", name: "Free", price: "₹0", tagline: "Try friction analysis on a couple of workflows.", cta: "Join waitlist" },
  { id: "personal", name: "Personal", price: "₹249", tagline: "For individuals and students improving daily routines.", cta: "Register interest" },
  { id: "professional", name: "Professional", price: "₹699", tagline: "For freelancers and solo professionals.", cta: "Register interest", featured: true },
  { id: "business", name: "Business", price: "₹2,499", tagline: "For small teams and business owners.", cta: "Register interest" },
];

const FEATURES: { label: string; values: (string | boolean)[] }[] = [
  { label: "Workflow analyses", values: ["3 / month", "30 / month", "Unlimited", "Unlimited"] },
  { label: "Friction Explorer & Improvement Lab", values: [true, true, true, true] },
  { label: "Savings simulator", values: [true, true, true, true] },
  { label: "Saved workflows & history", values: [false, true, true, true] },
  { label: "Measured-results tracking", values: [false, true, true, true] },
  { label: "Exportable reports", values: [false, false, true, true] },
  { label: "Team members", values: ["—", "—", "—", "Up to 10"] },
  { label: "Priority support", values: [false, false, false, true] },
];

export default function PricingPage() {
  const [plan, setPlan] = React.useState<PlanId | null>(null);
  return (
    <div>
      <PageHeader eyebrow="Pricing" title="Proposed plans" subtitle="We're testing interest before launch. Choosing a plan registers your interest — no payment is taken." />
      <div className="mb-6 flex gap-3 rounded-xl border border-violet/25 bg-violet/[0.06] p-4 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-violet" />
        <p>These are <strong className="text-ink">proposed prices, not confirmed commercial plans</strong>. Infinity ZERO is in validation; payments are not enabled.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} whileHover={{ y: -4 }}>
            <Card glow={p.featured} className={cn("flex h-full flex-col p-5", p.featured && "bg-gradient-to-b from-cyan/[0.08] to-transparent")}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                {p.featured && <Badge tone="cyan">Most likely fit</Badge>}
              </div>
              <p className="mt-3"><span className="font-display text-3xl font-bold">{p.price}</span><span className="text-sm text-muted">/month</span></p>
              <p className="mt-2 flex-1 text-sm text-muted">{p.tagline}</p>
              <Button className="mt-5 w-full" variant={p.featured ? "primary" : "secondary"} onClick={() => setPlan(p.id)}>{p.cta}</Button>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Feature comparison</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-4 font-medium text-muted">Feature</th>
              {PLANS.map((p) => <th key={p.id} className="p-4 text-center font-display font-semibold">{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.label} className="border-b border-line last:border-0">
                <td className="p-4 text-muted">{f.label}</td>
                {f.values.map((v, i) => (
                  <td key={i} className="p-4 text-center">
                    {v === true ? <Check className="mx-auto size-4 text-success" aria-label="Included" /> : v === false ? <Minus className="mx-auto size-4 text-subtle" aria-label="Not included" /> : <span className="text-ink">{v}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        {plan && <InterestDialog plan={plan} onClose={() => setPlan(null)} />}
      </Modal>
    </div>
  );
}

function InterestDialog({ plan, onClose }: { plan: PlanId; onClose: () => void }) {
  const p = PLANS.find((x) => x.id === plan)!;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [type, setType] = React.useState<RespondentType | "">("");
  const [error, setError] = React.useState<string | null>(null);
  const [state, setState] = React.useState<"idle" | "sending" | "done">("idle");
  const [local, setLocal] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== "idle") return;
    const parsed = pricingInterestSchema.safeParse({ plan, respondentType: type || null, name, email, note });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Please check the form"); return; }
    setState("sending");
    try {
      const res = await fetch("/api/pricing-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (d.storage === "local") {
        actions.addLocalPricingInterest({ ...parsed.data, id: uid(), createdAt: new Date().toISOString(), storage: "local" });
        setLocal(true);
      }
      setState("done");
    } catch (err) {
      setState("idle");
      toast.error("Couldn't register interest", { description: err instanceof Error ? err.message : undefined });
    }
  };

  if (state === "done") {
    return (
      <ModalContent title="You're on the list">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-12 text-success" />
          <p className="text-sm text-muted">Thanks for your interest in <strong className="text-ink">{p.name}</strong>. No payment was taken. {email ? "We'll email you when Infinity ZERO launches." : "Add an email next time if you'd like launch updates."}</p>
          {local && <p className="text-xs text-amber">Demo mode: saved on this device only.</p>}
          <Button onClick={onClose}>Done</Button>
        </div>
      </ModalContent>
    );
  }

  return (
    <ModalContent title={`Register interest — ${p.name} (${p.price}/mo)`} description="This is not a purchase. We're measuring which plans people would choose.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="pi-name">Name <span className="font-normal text-subtle">(optional)</span></Label><Input id="pi-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
          <div className="space-y-1.5"><Label htmlFor="pi-email">Email <span className="font-normal text-subtle">(optional)</span></Label><Input id="pi-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pi-type">I am a…</Label>
          <Select id="pi-type" value={type} onChange={(e) => setType(e.target.value as RespondentType | "")}>
            <option value="">Prefer not to say</option>
            {RESPONDENT_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="pi-note">Anything you'd need from this plan? <span className="font-normal text-subtle">(optional)</span></Label><Textarea id="pi-note" rows={3} className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <FieldError>{error}</FieldError>
        <p className="text-xs text-subtle">Your email is used only to contact you about Infinity ZERO's launch.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "Saving…" : "Register interest"}</Button>
        </div>
      </form>
    </ModalContent>
  );
}
