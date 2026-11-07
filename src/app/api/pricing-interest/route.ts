import { NextResponse } from "next/server";
import { pricingInterestSchema } from "@/lib/schema";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = pricingInterestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the form", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  const v = parsed.data;
  const supabase = getAdminSupabase() ?? (await getServerSupabase());
  if (!supabase) return NextResponse.json({ storage: "local", data: v });
  const { error } = await supabase.from("pricing_interest").insert({
    plan: v.plan, respondent_type: v.respondentType, name: v.name, email: v.email, note: v.note,
  });
  if (error) return NextResponse.json({ error: "We couldn't register your interest right now. Please try again." }, { status: 503 });
  return NextResponse.json({ storage: "supabase" });
}
