"use client";
import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Download, Info, KeyRound, Lock, RefreshCw, ShieldCheck, Sparkles, SlidersHorizontal } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AXIS, CHART_COLORS, ChartCard, GRID, TooltipBox } from "@/components/charts/chart-card";
import { useStatus } from "@/components/layout/providers";
import { actions, useAppState, useHydrated } from "@/lib/store";
import { downloadCSV, feedbackStats, toCSV, topTerms, validationVerdict } from "@/lib/validation";
import { PLAN_IDS, RESPONDENT_TYPES, type FeedbackResponse, type PricingInterest, type ValidationThresholds } from "@/lib/types";
import type { FeedbackSummary } from "@/lib/schema";
import { cn, formatDate } from "@/lib/utils";

const PASS_KEY = "iz:founder-pass";
const getPass = () => { try { return sessionStorage.getItem(PASS_KEY) ?? ""; } catch { return ""; } };

type Remote = { storage: "local" } | { storage: "supabase"; feedback: FeedbackResponse[]; pricingInterest: PricingInterest[] };

export default function FounderPage() {
  const status = useStatus();
  const hydrated = useHydrated();
  const localFeedback = useAppState((s) => s.feedback);
  const localInterest = useAppState((s) => s.pricingInterest);
  const thresholds = useAppState((s) => s.settings.thresholds);

  const [auth, setAuth] = React.useState<"checking" | "ok" | "denied">("checking");
  const [remote, setRemote] = React.useState<Remote | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pass, setPass] = React.useState("");
  const [filter, setFilter] = React.useState<string>("all");

  const load = React.useCallback(async () => {
    setLoadError(null);
    const headers = { "x-founder-passcode": getPass() };
    const v = await fetch("/api/founder/verify", { headers }).catch(() => null);
    if (!v || !v.ok) { setAuth("denied"); return; }
    setAuth("ok");
    const r = await fetch("/api/feedback", { headers }).catch(() => null);
    if (!r) { setLoadError("Network error while loading feedback."); return; }
    const d = await r.json();
    if (!r.ok) { setLoadError(d.error ?? "Could not load feedback."); return; }
    setRemote(d);
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const feedback = remote?.storage === "supabase" ? remote.feedback : localFeedback;
  const interest = remote?.storage === "supabase" ? remote.pricingInterest : localInterest;
  const filtered = filter === "all" ? feedback : feedback.filter((f) => (f.respondentType ?? "Unspecified") === filter);
  const stats = feedbackStats(filtered);
  const verdict = validationVerdict(stats, thresholds);
  const improvementTerms = topTerms(filtered.flatMap((f) => [f.featureWish, f.improvementDetail, f.usefulnessDetail]).filter(Boolean));
  const painTerms = topTerms(filtered.map((f) => f.timeConsumingTask).filter(Boolean));

  if (auth === "checking" || !hydrated) return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-64" /></div>;

  if (auth === "denied") {
    return (
      <div className="mx-auto max-w-md">
        <Card glow className="p-6">
          <div className="mb-4 grid size-12 place-items-center rounded-xl bg-violet/15 text-violet"><Lock className="size-6" /></div>
          <h1 className="font-display text-xl font-semibold">Founder access required</h1>
          <p className="mt-2 text-sm text-muted">This research dashboard is private to Infinity Web &amp; Apps.</p>
          {status.founderPasscode && (
            <form
              className="mt-5 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try { sessionStorage.setItem(PASS_KEY, pass); } catch {}
                setAuth("checking");
                await load();
              }}
            >
              <Label htmlFor="founder-pass">Founder passcode</Label>
              <Input id="founder-pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
              <Button type="submit" className="w-full"><KeyRound /> Unlock</Button>
            </form>
          )}
          {status.supabase && <p className="mt-4 text-xs text-subtle">Or <Link className="text-cyan hover:underline" href="/settings">sign in</Link> with an account whose profile role is <code>founder</code>.</p>}
        </Card>
      </div>
    );
  }

  const ratingData = [
    { name: "Excellent", value: stats.ratings.excellent },
    { name: "Good", value: stats.ratings.good },
    { name: "Needs Improvement", value: stats.ratings.needs_improvement },
  ];
  const payData = [{ name: "Yes", value: stats.pay.yes }, { name: "Maybe", value: stats.pay.maybe }, { name: "No", value: stats.pay.no }];
  const priceData = Object.entries(stats.priceRanges).map(([name, value]) => ({ name, value }));
  const typeData = [...RESPONDENT_TYPES, "Unspecified"].map((t) => ({ name: t, value: feedback.filter((f) => (f.respondentType ?? "Unspecified") === t).length })).filter((d) => d.value > 0);
  const planData = PLAN_IDS.map((p) => ({ name: p[0].toUpperCase() + p.slice(1), value: interest.filter((i) => i.plan === p).length }));

  const exportCSV = () => {
    const csv = toCSV(filtered.map((f) => ({
      id: f.id, submitted_at: f.createdAt, respondent_type: f.respondentType ?? "", source: f.source, usefulness: f.usefulness,
      usefulness_detail: f.usefulnessDetail, rating: f.rating, improvement_detail: f.improvementDetail, experience: f.experience,
      time_consuming_task: f.timeConsumingTask, feature_wish: f.featureWish, pay_intent: f.payIntent ?? "", price_range: f.priceRange ?? "",
    })));
    if (!csv) return toast.error("No responses to export");
    downloadCSV(`infinity-zero-feedback-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Founder Insights · Private"
        title="Customer validation dashboard"
        subtitle="Real responses only. Use this to decide whether Infinity ZERO is worth developing further."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}><RefreshCw /> Refresh</Button>
            <Button variant="secondary" size="sm" onClick={exportCSV}><Download /> Export CSV</Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={remote?.storage === "supabase" ? "success" : "amber"}><ShieldCheck /> {remote?.storage === "supabase" ? "Supabase · all devices" : "Demo mode · this device only"}</Badge>
        <span className="ml-auto text-sm text-muted">Respondent</span>
        {["all", ...RESPONDENT_TYPES, "Unspecified"].map((t) => (
          <button key={t} onClick={() => setFilter(t)} aria-pressed={filter === t} className={cn("rounded-lg border px-2.5 py-1 text-xs", filter === t ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-muted hover:text-ink")}>
            {t === "all" ? "All" : t}
          </button>
        ))}
      </div>
      {loadError && <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{loadError}</p>}

      {feedback.length === 0 ? (
        <EmptyState icon={<Info />} title="No feedback yet" body="Responses appear here as people complete the feedback survey or the Live Demo. Nothing is pre-filled or invented." action={<><Button asChild><Link href="/demo">Open Live Demo</Link></Button><Button variant="secondary" asChild><Link href="/feedback">Feedback form</Link></Button></>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Total responses" value={String(stats.n)} />
            <Kpi label="Say it's useful" value={`${stats.usefulYesPct}%`} sub={`${stats.usefulAnyPct}% incl. “possibly”`} />
            <Kpi label="Would consider paying" value={stats.payAnswered ? `${stats.payPct}%` : "—"} sub={`${stats.payAnswered} answered`} />
            <Kpi label="Waitlist / plan interest" value={String(interest.length)} sub="from Pricing page" />
          </div>

          <VerdictCard verdict={verdict} thresholds={thresholds} n={stats.n} />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <SimpleBar title="Overall rating" data={ratingData} />
            <SimpleBar title="Subscription interest" data={payData} />
            <SimpleBar title="Willingness-to-pay ranges" description="Among yes/maybe respondents who chose a range" data={priceData} />
            <SimpleBar title="Responses by customer category" data={typeData} />
            <SimpleBar title="Pricing interest by plan" description="Proposed prices — interest only, no payments" data={planData} />
            <Card>
              <CardHeader><CardTitle>Most mentioned words</CardTitle><CardDescription>Word frequency in free text (no AI). Counts = number of responses.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <TermList title="Requested improvements" terms={improvementTerms} />
                <TermList title="Customer pain points" terms={painTerms} />
              </CardContent>
            </Card>
          </div>

          <AISummary entries={filtered} aiAvailable={status.aiProviders.length > 0} />

          <Card className="mt-5">
            <CardHeader><CardTitle>Individual responses ({filtered.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs text-subtle">
                    <tr>{["Date", "Respondent", "Useful", "Rating", "Pay", "Price", "Feedback", "Wish / improve", "Pain point"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr key={f.id} className="border-t border-line align-top">
                        <td className="whitespace-nowrap px-3 py-2 text-muted">{formatDate(f.createdAt)}</td>
                        <td className="px-3 py-2 text-muted">{f.respondentType ?? "—"}</td>
                        <td className="px-3 py-2"><Badge tone={f.usefulness === "yes" ? "success" : f.usefulness === "possibly" ? "amber" : "danger"}>{f.usefulness}</Badge></td>
                        <td className="px-3 py-2 text-muted">{f.rating.replace("_", " ")}</td>
                        <td className="px-3 py-2 text-muted">{f.payIntent ?? "—"}</td>
                        <td className="px-3 py-2 text-muted">{f.priceRange ?? "—"}</td>
                        <td className="max-w-56 px-3 py-2 text-muted">{f.experience || "—"}</td>
                        <td className="max-w-56 px-3 py-2 text-muted">{[f.featureWish, f.improvementDetail, f.usefulnessDetail].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="max-w-56 px-3 py-2 text-muted">{f.timeConsumingTask || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {remote?.storage !== "supabase" && (
                <Button variant="ghost" size="sm" className="mt-3 text-danger" onClick={() => { if (confirm("Delete all locally stored feedback and pricing interest on this device?")) actions.clearLocalFeedback(); }}>
                  Clear local demo responses
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-subtle">{sub}</p>}
    </Card>
  );
}

function SimpleBar({ title, description, data }: { title: string; description?: string; data: { name: string; value: number }[] }) {
  return (
    <ChartCard title={title} description={description} empty={data.every((d) => d.value === 0)} table={{ columns: ["Answer", "Responses"], rows: data.map((d) => [d.name, d.value]) }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} tickLine={false} interval={0} />
          <YAxis allowDecimals={false} {...AXIS} tickLine={false} axisLine={false} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
          <Bar dataKey="value" name="Responses" radius={[4, 4, 0, 0]} maxBarSize={40} label={{ position: "top", fill: "#94a3c4", fontSize: 11 }}>
            {data.map((d) => <Cell key={d.name} fill={CHART_COLORS[0]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function TermList({ title, terms }: { title: string; terms: { term: string; count: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{title}</h3>
      {terms.length === 0 ? <p className="text-sm text-subtle">No answers yet.</p> : (
        <ul className="flex flex-wrap gap-1.5">
          {terms.map((t) => <li key={t.term}><Badge tone="royal">{t.term} · {t.count}</Badge></li>)}
        </ul>
      )}
    </div>
  );
}

function VerdictCard({ verdict, thresholds, n }: { verdict: ReturnType<typeof validationVerdict>; thresholds: ValidationThresholds; n: number }) {
  const [edit, setEdit] = React.useState(false);
  const tone = verdict.verdict === "Promising" ? "success" : verdict.verdict === "Low Interest" ? "danger" : "amber";
  const fields: [keyof ValidationThresholds, string][] = [
    ["minResponses", "Minimum responses"],
    ["promisingUsefulPct", "“Promising” if ≥ % say Yes, definitely"],
    ["promisingPayPct", "…and ≥ % would consider paying"],
    ["lowInterestUsefulPct", "“Low interest” if < % yes or possibly"],
  ];
  return (
    <Card glow className="mt-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle">Validation summary · {n} responses</p>
          <p className={cn("mt-1 font-display text-2xl font-bold", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-amber")}>{verdict.verdict}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEdit((e) => !e)} aria-expanded={edit}><SlidersHorizontal /> Thresholds</Button>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted">{verdict.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
      <p className="mt-3 text-xs text-subtle">This is a rule-of-thumb signal with transparent thresholds — not evidence of product-market fit.</p>
      {edit && (
        <div className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
          {fields.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`t-${k}`} className="text-xs font-normal text-muted">{label}</Label>
              <Input id={`t-${k}`} type="number" min={0} max={k === "minResponses" ? 10000 : 100} value={thresholds[k]} onChange={(e) => actions.updateSettings({ thresholds: { ...thresholds, [k]: Math.max(0, Number(e.target.value)) } })} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AISummary({ entries, aiAvailable }: { entries: FeedbackResponse[]; aiAvailable: boolean }) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ summary: FeedbackSummary; provider: string } | null>(null);
  const shortId = (id: string) => `#${entries.findIndex((e) => e.id === id) + 1}`;
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-founder-passcode": getPass() },
        body: JSON.stringify({ entries: entries.slice(0, 300).map((e) => ({ id: e.id, respondentType: e.respondentType, experience: e.experience, usefulness: e.usefulness, usefulnessDetail: e.usefulnessDetail, rating: e.rating, improvementDetail: e.improvementDetail, timeConsumingTask: e.timeConsumingTask, featureWish: e.featureWish, payIntent: e.payIntent })) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Summary failed");
      setResult(d);
    } catch (e) {
      toast.error("AI summary unavailable", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };
  const sections: [keyof FeedbackSummary, string][] = [
    ["repeatedProblems", "Repeated problems"], ["requestedImprovements", "Most requested improvements"], ["reasonsToUse", "Reasons people would use it"],
    ["reasonsToReject", "Reasons people would reject it"], ["mvpPriorities", "Potential MVP priorities"],
  ];
  return (
    <Card className="mt-5">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-violet" /> AI feedback summary</CardTitle>
          <CardDescription>Summarises only the responses shown. Every point cites the response numbers it comes from.</CardDescription>
        </div>
        <Button onClick={run} disabled={!aiAvailable || loading || entries.length === 0} title={aiAvailable ? undefined : "Add an AI provider key to enable"}>
          <Sparkles /> {loading ? "Summarising…" : "Summarise responses"}
        </Button>
      </CardHeader>
      <CardContent>
        {!aiAvailable && <p className="text-sm text-subtle">Not configured: add a free GROQ_API_KEY (or Gemini / OpenRouter / Cerebras key) to enable AI summaries. The statistics above work without AI.</p>}
        {result && (
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map(([k, label]) => (
              <div key={k} className="rounded-xl border border-line bg-white/[0.02] p-4">
                <h3 className="text-sm font-semibold">{label}</h3>
                {result.summary[k].length === 0 ? <p className="mt-2 text-sm text-subtle">No supporting responses.</p> : (
                  <ul className="mt-2 space-y-2 text-sm text-muted">
                    {result.summary[k].map((p, i) => <li key={i}>{p.point} <span className="text-xs text-cyan">({p.entryIds.map(shortId).join(", ")})</span></li>)}
                  </ul>
                )}
              </div>
            ))}
            <p className="text-xs text-subtle md:col-span-2">Generated by {result.provider}. Response numbers refer to rows in the table below (#1 = first row). Verify before acting.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
