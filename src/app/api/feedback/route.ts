import { NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/schema";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { checkFounder } from "@/lib/founder";
import type { FeedbackResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string; submission_key: string; respondent_type: FeedbackResponse["respondentType"]; experience: string;
  usefulness: FeedbackResponse["usefulness"]; usefulness_detail: string; rating: FeedbackResponse["rating"];
  improvement_detail: string; time_consuming_task: string; feature_wish: string; pay_intent: FeedbackResponse["payIntent"];
  price_range: string | null; source: FeedbackResponse["source"]; created_at: string;
};

const toResponse = (r: Row): FeedbackResponse => ({
  id: r.id, submissionKey: r.submission_key, respondentType: r.respondent_type, experience: r.experience,
  usefulness: r.usefulness, usefulnessDetail: r.usefulness_detail, rating: r.rating, improvementDetail: r.improvement_detail,
  timeConsumingTask: r.time_consuming_task, featureWish: r.feature_wish, payIntent: r.pay_intent, priceRange: r.price_range,
  source: r.source, createdAt: r.created_at, storage: "supabase",
});

/** Submit feedback. Without Supabase, tells the client to keep it in labelled local demo storage. */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted answers", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const v = parsed.data;
  // Only keep the conditional answers that apply.
  const usefulnessDetail = v.usefulness === "yes" ? "" : v.usefulnessDetail;
  const improvementDetail = v.rating === "needs_improvement" ? v.improvementDetail : "";
  const priceRange = v.payIntent === "yes" || v.payIntent === "maybe" ? v.priceRange : null;

  const supabase = getAdminSupabase() ?? (await getServerSupabase());
  if (!supabase) return NextResponse.json({ storage: "local", data: { ...v, usefulnessDetail, improvementDetail, priceRange } });

  const id = crypto.randomUUID();
  const { error } = await supabase.from("feedback_responses").insert({
    id, submission_key: v.submissionKey, respondent_type: v.respondentType, experience: v.experience,
    usefulness: v.usefulness, usefulness_detail: usefulnessDetail, rating: v.rating, improvement_detail: improvementDetail,
    time_consuming_task: v.timeConsumingTask, feature_wish: v.featureWish, pay_intent: v.payIntent,
    price_range: priceRange, source: v.source,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ storage: "supabase", duplicate: true });
    console.error("feedback insert failed", error.message);
    return NextResponse.json({ error: "We couldn't save your feedback right now. Please try again." }, { status: 503 });
  }
  const requests = [
    ["feature_wish", v.featureWish], ["improvement", improvementDetail],
    ["usefulness_gap", usefulnessDetail], ["pain_point", v.timeConsumingTask],
  ].filter(([, b]) => b && b.trim().length > 0).map(([kind, body]) => ({ feedback_id: id, kind, body }));
  if (requests.length) {
    const r = await supabase.from("feedback_feature_requests").insert(requests);
    if (r.error) console.error("feature request insert failed", r.error.message);
  }
  return NextResponse.json({ storage: "supabase", id });
}

/** Founder-only: list stored feedback and pricing interest. */
export async function GET(req: Request) {
  const auth = await checkFounder(req);
  if (!auth.ok) return NextResponse.json({ error: "Founder access required" }, { status: 401 });
  const supabase = auth.via === "passcode" ? getAdminSupabase() ?? (await getServerSupabase()) : await getServerSupabase();
  if (!supabase) return NextResponse.json({ storage: "local" });

  const [fb, pi] = await Promise.all([
    supabase.from("feedback_responses").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("pricing_interest").select("id, plan, respondent_type, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  if (fb.error) return NextResponse.json({ error: "Could not load feedback: " + fb.error.message }, { status: 503 });
  return NextResponse.json({
    storage: "supabase",
    feedback: (fb.data as Row[]).map(toResponse),
    pricingInterest: (pi.data ?? []).map((p) => ({
      id: p.id, plan: p.plan, respondentType: p.respondent_type, createdAt: p.created_at, name: "", email: "", note: "", storage: "supabase",
    })),
  });
}
