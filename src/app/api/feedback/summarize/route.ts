import { NextResponse } from "next/server";
import { feedbackSummarySchema, summaryRequestSchema } from "@/lib/schema";
import { runJSONChain, configuredProviders } from "@/lib/ai/providers";
import { SUMMARY_SYSTEM } from "@/lib/ai/prompts";
import { checkFounder } from "@/lib/founder";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await checkFounder(req);
  if (!auth.ok) return NextResponse.json({ error: "Founder access required" }, { status: 401 });
  if (configuredProviders().length === 0) {
    return NextResponse.json({ error: "No AI provider is configured. Add GROQ_API_KEY (or another provider key) to enable summaries." }, { status: 501 });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = summaryRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "No feedback entries to summarise" }, { status: 422 });

  const entries = parsed.data.entries;
  const result = await runJSONChain({
    system: SUMMARY_SYSTEM,
    user: "Feedback entries (JSON):\n" + JSON.stringify(entries),
    schema: feedbackSummarySchema,
    maxTokens: 2000,
  });
  if (!result.data) return NextResponse.json({ error: "All AI providers failed", attempts: result.attempts }, { status: 502 });

  // Drop any citation that does not refer to a real entry, and any point left without evidence.
  const ids = new Set(entries.map((e) => e.id));
  const clean = Object.fromEntries(
    Object.entries(result.data).map(([k, list]) => [
      k,
      list.map((p) => ({ ...p, entryIds: p.entryIds.filter((id) => ids.has(id)) })).filter((p) => p.entryIds.length > 0),
    ]),
  );
  return NextResponse.json({ summary: clean, provider: result.provider, model: result.model, attempts: result.attempts });
}
