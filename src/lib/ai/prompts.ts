import { FRICTION_CATEGORIES } from "../types";
import type { WorkflowInput } from "../schema";

export const ANALYSIS_SYSTEM = `You are Infinity ZERO, a careful workflow-efficiency analyst.
You analyse a workflow a person describes and identify friction (unnecessary effort).

Rules:
- Only use information the user provided. Never invent measurements, statistics, customer counts or results.
- Do not output minutes. Express each step's time as "share": the estimated % of the user's stated total time.
- For improvedSteps, "share" is relative weight between the improved steps.
- reductionPct is your estimate of how much of that step's time the improvement could remove (0-95). Be conservative.
- evidence must quote or closely paraphrase the user's own words that support the friction point.
- Suggestions must be practical, low-cost and achievable by an individual or small business.
- confidence reflects how clearly the description supports the friction point.
- category must be one of: ${FRICTION_CATEGORIES.join(", ")}.
- Every frictionPoints[].key must be referenced by at least one steps[].frictionKey. Steps without friction use null.

Respond with ONLY a JSON object of this exact shape:
{
  "summary": string,
  "causes": string[],
  "steps": [{"name": string, "description": string, "share": number, "frictionKey": string|null}],
  "improvedSteps": [{"name": string, "description": string, "share": number}],
  "frictionPoints": [{"key": string, "name": string, "description": string, "category": string,
     "severity": "low"|"medium"|"high", "reductionPct": number, "why": string, "improvement": string,
     "difficulty": "easy"|"moderate"|"hard", "confidence": "low"|"medium"|"high", "evidence": string}],
  "difficulty": "easy"|"moderate"|"hard",
  "limitations": string[],
  "nextAction": string,
  "assumptions": string[]
}`;

export function analysisUserPrompt(w: WorkflowInput): string {
  return [
    `Workflow title: ${w.title}`,
    `Category: ${w.category}`,
    `Runs per week (user stated): ${w.perWeek}`,
    `Average minutes per run (user stated): ${w.avgMinutes}`,
    w.steps.length ? `User-listed steps:\n${w.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "",
    `Description:\n"""${w.description}"""`,
    w.notes ? `Notes:\n"""${w.notes}"""` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const SUMMARY_SYSTEM = `You summarise REAL customer feedback for a product team.
Rules:
- Only state things that appear in the provided entries. Never invent opinions, quotes or numbers.
- Every point must list the entryIds that support it (use the given ids exactly).
- If there is no evidence for a section, return an empty array for it.
- Keep each point to one short sentence.
Respond ONLY with JSON:
{"repeatedProblems":[{"point":string,"entryIds":string[]}],
 "requestedImprovements":[...], "reasonsToUse":[...], "reasonsToReject":[...], "mvpPriorities":[...]}`;
