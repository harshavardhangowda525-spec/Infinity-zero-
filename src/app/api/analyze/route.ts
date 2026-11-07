import { NextResponse } from "next/server";
import { analyzeRequestSchema } from "@/lib/schema";
import { aiAnalysisSchema } from "@/lib/schema";
import { normalizeAIAnalysis, ruleBasedAnalysis } from "@/lib/analysis";
import { runJSONChain } from "@/lib/ai/providers";
import { ANALYSIS_SYSTEM, analysisUserPrompt } from "@/lib/ai/prompts";
import { getSample } from "@/lib/samples";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const { workflow, sampleId, forceDemo } = parsed.data;
  const analysisId = crypto.randomUUID();
  const workflowId = crypto.randomUUID();

  // Untouched sample scenarios return their prewritten, clearly labelled sample analysis.
  const sample = sampleId ? getSample(sampleId) : undefined;
  if (
    sample &&
    sample.workflow.description.trim() === workflow.description.trim() &&
    sample.workflow.perWeek === workflow.perWeek &&
    sample.workflow.avgMinutes === workflow.avgMinutes
  ) {
    return NextResponse.json({
      analysis: { ...sample.analysis, id: analysisId, workflowId, createdAt: new Date().toISOString(), source: { kind: "sample", sampleId: sample.id } },
      workflowId,
      attempts: [],
    });
  }

  if (!forceDemo) {
    const result = await runJSONChain({ system: ANALYSIS_SYSTEM, user: analysisUserPrompt(workflow), schema: aiAnalysisSchema });
    if (result.data) {
      return NextResponse.json({
        analysis: normalizeAIAnalysis(result.data, workflow, analysisId, workflowId, { kind: "ai", provider: result.provider!, model: result.model! }),
        workflowId,
        attempts: result.attempts,
      });
    }
    return NextResponse.json({ analysis: ruleBasedAnalysis(workflow, analysisId, workflowId), workflowId, attempts: result.attempts });
  }
  return NextResponse.json({ analysis: ruleBasedAnalysis(workflow, analysisId, workflowId), workflowId, attempts: [] });
}
