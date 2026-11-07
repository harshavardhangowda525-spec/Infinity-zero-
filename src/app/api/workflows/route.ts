import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Analysis, ImprovementPlan, Measurement, Workflow } from "@/lib/types";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: NextResponse.json({ error: "Accounts are not configured" }, { status: 501 }) };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  return { supabase, user: data.user };
}

/** Load the signed-in user's own workflows, analyses, plans and measurements (RLS-scoped). */
export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { supabase } = r;
  const [w, s, a, p, m] = await Promise.all([
    supabase.from("workflows").select("*").order("created_at", { ascending: false }),
    supabase.from("workflow_steps").select("workflow_id, position, name").order("position"),
    supabase.from("analyses").select("payload").order("created_at", { ascending: false }),
    supabase.from("improvement_plans").select("*"),
    supabase.from("improvement_measurements").select("*"),
  ]);
  const err = w.error || a.error || p.error || m.error || s.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 503 });
  const workflows: Workflow[] = (w.data ?? []).map((x) => ({
    id: x.id, title: x.title, category: x.category, description: x.description, perWeek: Number(x.per_week),
    avgMinutes: Number(x.avg_minutes), notes: x.notes, createdAt: x.created_at, sampleId: x.sample_id ?? undefined,
    steps: (s.data ?? []).filter((st) => st.workflow_id === x.id).map((st) => st.name),
  }));
  const plans: ImprovementPlan[] = (p.data ?? []).map((x) => ({
    id: x.id, analysisId: x.analysis_id, workflowId: "", title: x.title, status: x.status, frictionDecisions: x.friction_decisions,
    inputs: x.inputs, createdAt: x.created_at, updatedAt: x.updated_at, implementedAt: x.implemented_at ?? undefined,
  }));
  const analyses = (a.data ?? []).map((x) => x.payload as Analysis);
  plans.forEach((pl) => { pl.workflowId = analyses.find((an) => an.id === pl.analysisId)?.workflowId ?? ""; });
  const measurements: Measurement[] = (m.data ?? []).map((x) => ({
    id: x.id, planId: x.plan_id, beforeMinutes: Number(x.before_minutes), afterMinutes: Number(x.after_minutes),
    executionsMeasured: x.executions_measured, notes: x.notes, measuredAt: x.measured_at,
  }));
  return NextResponse.json({ workflows, analyses, plans, measurements });
}

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("analysis"), workflow: z.custom<Workflow>(), analysis: z.custom<Analysis>() }),
  z.object({ type: z.literal("plan"), plan: z.custom<ImprovementPlan>() }),
  z.object({ type: z.literal("measurement"), measurement: z.custom<Measurement>() }),
  z.object({ type: z.literal("deleteWorkflow"), workflowId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { supabase, user } = r;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  const b = parsed.data;

  if (b.type === "analysis") {
    const { workflow: wf, analysis: an } = b;
    const w = await supabase.from("workflows").upsert({
      id: wf.id, user_id: user.id, title: wf.title, category: wf.category, description: wf.description,
      per_week: wf.perWeek, avg_minutes: wf.avgMinutes, notes: wf.notes ?? "", sample_id: wf.sampleId ?? null,
    });
    if (w.error) return NextResponse.json({ error: w.error.message }, { status: 503 });
    if (wf.steps?.length) {
      await supabase.from("workflow_steps").delete().eq("workflow_id", wf.id);
      await supabase.from("workflow_steps").insert(wf.steps.map((name, position) => ({ workflow_id: wf.id, position, name })));
    }
    const a = await supabase.from("analyses").upsert({
      id: an.id, workflow_id: wf.id, user_id: user.id, source_kind: an.source.kind,
      provider: an.source.kind === "ai" ? an.source.provider : null, model: an.source.kind === "ai" ? an.source.model : null,
      summary: an.summary, current_minutes: an.currentMinutes, improved_minutes: an.improvedMinutes, per_week: an.perWeek,
      difficulty: an.difficulty, payload: an,
    });
    if (a.error) return NextResponse.json({ error: a.error.message }, { status: 503 });
    await supabase.from("friction_points").delete().eq("analysis_id", an.id);
    if (an.frictionPoints.length) {
      await supabase.from("friction_points").insert(an.frictionPoints.map((f) => ({
        analysis_id: an.id, client_ref: f.id, name: f.name, category: f.category, severity: f.severity, confidence: f.confidence,
        difficulty: f.difficulty, minutes_per_execution: f.minutesPerExecution, improved_minutes: f.improvedMinutes,
      })));
    }
    return NextResponse.json({ ok: true });
  }
  if (b.type === "plan") {
    const p = b.plan;
    const res = await supabase.from("improvement_plans").upsert({
      id: p.id, user_id: user.id, analysis_id: p.analysisId, title: p.title, status: p.status,
      friction_decisions: p.frictionDecisions, inputs: p.inputs, implemented_at: p.implementedAt ?? null,
    });
    return res.error ? NextResponse.json({ error: res.error.message }, { status: 503 }) : NextResponse.json({ ok: true });
  }
  if (b.type === "measurement") {
    const m = b.measurement;
    const res = await supabase.from("improvement_measurements").upsert({
      id: m.id, user_id: user.id, plan_id: m.planId, before_minutes: m.beforeMinutes, after_minutes: m.afterMinutes,
      executions_measured: m.executionsMeasured, notes: m.notes, measured_at: m.measuredAt,
    });
    return res.error ? NextResponse.json({ error: res.error.message }, { status: 503 }) : NextResponse.json({ ok: true });
  }
  const res = await supabase.from("workflows").delete().eq("id", b.workflowId);
  return res.error ? NextResponse.json({ error: res.error.message }, { status: 503 }) : NextResponse.json({ ok: true });
}

/** Delete every workflow, analysis, plan and measurement the signed-in user owns. */
export async function DELETE() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { supabase, user } = r;
  const res = await supabase.from("workflows").delete().eq("user_id", user.id); // cascades to steps, analyses, frictions, plans, measurements
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 503 });
  await supabase.from("user_settings").update({ hourly_value: null }).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
