import type { AIAnalysis, WorkflowInput } from "./schema";
import type { Analysis, AnalysisSource, Difficulty, FrictionCategory, FrictionPoint, Level, WorkflowStep } from "./types";
import { FRICTION_CATEGORY_LABELS } from "./types";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const round1 = (n: number) => Math.round(n * 10) / 10;

function severityFor(weeklyMinutes: number): Level {
  if (weeklyMinutes >= 120) return "high";
  if (weeklyMinutes >= 30) return "medium";
  return "low";
}

const BASE_ASSUMPTIONS = (w: WorkflowInput) => [
  `Uses your stated ${w.avgMinutes} min per run and ${w.perWeek} runs per week — nothing is measured automatically.`,
  "Time per step is an estimated split of your total time, not a measurement.",
  "Improved durations assume the suggestion is set up and used consistently.",
];

/* ------------------------------------------------------------------ */
/* Rule-based analyzer (used when no AI provider is reachable)        */
/* ------------------------------------------------------------------ */

const RULES: { category: FrictionCategory; re: RegExp; reduction: number }[] = [
  { category: "unnecessary_approvals", re: /\b(approv\w*|sign[- ]?off|permission|authori[sz]\w*|review\w*)\b/i, reduction: 0.45 },
  { category: "duplicate_entry", re: /\b(cop(y|ies|ying)|re-?typ\w*|re-?enter\w*|past(e|ing)|duplicate\w*|transfer\w*|again into)\b/i, reduction: 0.75 },
  { category: "info_searching", re: /\b(search\w*|find\w*|look(ing)? (for|through)|locat\w*|hunt\w*|dig\w*)\b/i, reduction: 0.7 },
  { category: "manual_scheduling", re: /\b(schedul\w*|appointment\w*|book\w*|slot\w*|calendar|diary|meeting\w*|deadline\w*)\b/i, reduction: 0.65 },
  { category: "communication_delays", re: /\b(follow[- ]?ups?|remind\w*|chas\w*|wait\w*|nudg\w*)\b/i, reduction: 0.6 },
  { category: "repeated_responses", re: /\b(repl(y|ies|ying)|respond\w*|answer\w*|enquir\w*|inquir\w*|questions?)\b/i, reduction: 0.7 },
  { category: "repetitive_manual", re: /\b(manual\w*|by hand|every time|each time|from scratch|repeat\w*|prepar\w*|writ(e|ing))\b/i, reduction: 0.5 },
  { category: "disconnected_tools", re: /\b(excel|spreadsheets?|whatsapp|e-?mail\w*|pdf|word doc\w*|export\w*|upload\w*|download\w*|drive|sheets?)\b/i, reduction: 0.4 },
];

const IMPROVEMENTS: Record<FrictionCategory, { why: string; improvement: string; after: string; difficulty: Difficulty }> = {
  repeated_responses: {
    why: "The same answer is written again for every person, so effort grows with volume.",
    improvement: "Save reusable reply templates (quick replies / canned responses) for the most common questions.",
    after: "Template reply",
    difficulty: "easy",
  },
  manual_scheduling: {
    why: "Agreeing times by hand needs several rounds of messages and calendar checks.",
    improvement: "Share a booking link or recurring calendar slots so people can choose a time themselves.",
    after: "Self-serve booking",
    difficulty: "moderate",
  },
  communication_delays: {
    why: "Waiting and chasing depends on memory, and each nudge breaks your focus.",
    improvement: "Schedule follow-up reminders or messages at the moment the task is created.",
    after: "Scheduled follow-up",
    difficulty: "easy",
  },
  unnecessary_approvals: {
    why: "Work pauses while waiting for someone else to confirm it.",
    improvement: "Agree clear approval rules or a one-click approval link with a deadline.",
    after: "Quick approval",
    difficulty: "moderate",
  },
  duplicate_entry: {
    why: "The same information is typed more than once, which takes time and causes errors.",
    improvement: "Enter data once in a single source and link or convert it instead of re-typing.",
    after: "Single data entry",
    difficulty: "moderate",
  },
  info_searching: {
    why: "Information lives in several places, so every search covers multiple apps.",
    improvement: "Create one organised, searchable location and save items there immediately.",
    after: "One organised source",
    difficulty: "easy",
  },
  repetitive_manual: {
    why: "A repeatable task is redone from the beginning each time.",
    improvement: "Turn it into a template or checklist you fill in rather than recreate.",
    after: "Template / checklist",
    difficulty: "easy",
  },
  disconnected_tools: {
    why: "Moving information between separate apps adds small, repeated manual steps.",
    improvement: "Use one tool for the whole step, or connect the tools you already use.",
    after: "Connected step",
    difficulty: "moderate",
  },
};

export function splitIntoSteps(description: string): string[] {
  const parts = description
    .replace(/\s+/g, " ")
    .split(/[.;\n]|,\s*(?:and\s+)?(?:then\s+)?|\s(?:and )?then\s|\safter that\s|\sand\s(?=(?:I|we)\s)/i)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 3);
  return parts.slice(0, 8);
}

function stepName(clause: string): string {
  const cleaned = clause
    .replace(/^(whenever|when|every|each|before|after|then|and|so|also)\b[^,]*?,?\s*/i, (m) => (m.split(" ").length > 6 ? "" : m))
    .replace(/^(i|we)\s+(have to|need to|usually|always|manually|then)?\s*/i, "")
    .trim();
  const words = (cleaned || clause).split(" ").slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ruleBasedAnalysis(w: WorkflowInput, id: string, workflowId: string): Analysis {
  const clauses = w.steps.length >= 2 ? w.steps : splitIntoSteps(w.description);
  const list = clauses.length >= 2 ? clauses : [w.description];

  const matches = list.map((clause) => {
    const rule = RULES.find((r) => r.re.test(clause));
    const evidenceMatch = rule ? clause.match(rule.re)?.[0] : undefined;
    return { clause, rule, evidenceMatch };
  });

  const weights = matches.map((m) => (m.rule ? 1.5 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const frictionPoints: FrictionPoint[] = [];
  const beforeSteps: WorkflowStep[] = matches.map((m, i) => {
    const minutes = round1((weights[i] / totalWeight) * w.avgMinutes);
    const stepId = `${id}_b${i + 1}`;
    const step: WorkflowStep = { id: stepId, name: stepName(m.clause), description: m.clause, minutes, friction: false };
    if (m.rule) {
      const meta = IMPROVEMENTS[m.rule.category];
      const fid = `${id}_f${i + 1}`;
      const improved = round1(minutes * (1 - m.rule.reduction));
      frictionPoints.push({
        id: fid,
        stepId,
        name: `${FRICTION_CATEGORY_LABELS[m.rule.category]}: ${step.name.toLowerCase()}`,
        description: m.clause,
        category: m.rule.category,
        severity: severityFor((minutes - improved) * w.perWeek),
        frequencyPerWeek: w.perWeek,
        minutesPerExecution: minutes,
        improvedMinutes: improved,
        why: meta.why,
        improvement: meta.improvement,
        difficulty: meta.difficulty,
        confidence: m.rule.category === "disconnected_tools" ? "low" : "medium",
        evidence: `Keyword “${m.evidenceMatch}” in: “${m.clause}”`,
      });
      step.friction = true;
      step.frictionId = fid;
    }
    return step;
  });

  const afterSteps: WorkflowStep[] = beforeSteps.map((s, i) => {
    const f = frictionPoints.find((x) => x.stepId === s.id);
    return f
      ? { id: `${id}_a${i + 1}`, name: IMPROVEMENTS[f.category].after, description: f.improvement, minutes: f.improvedMinutes, friction: false }
      : { ...s, id: `${id}_a${i + 1}`, friction: false, frictionId: undefined };
  });

  const saved = frictionPoints.reduce((a, f) => a + (f.minutesPerExecution - f.improvedMinutes), 0);
  const categories = [...new Set(frictionPoints.map((f) => FRICTION_CATEGORY_LABELS[f.category].toLowerCase()))];
  const hardest = frictionPoints.some((f) => f.difficulty === "moderate") ? "moderate" : "easy";

  return {
    id,
    workflowId,
    createdAt: new Date().toISOString(),
    source: { kind: "rules" },
    summary: frictionPoints.length
      ? `“${w.title}” has ${beforeSteps.length} steps. ${frictionPoints.length} of them show common friction patterns (${categories.join(", ")}). These are pattern matches on your description, so review each one before acting on it.`
      : `We couldn't find common friction patterns in this description. Try listing the individual steps, including where you wait, copy, search or repeat things.`,
    causes: frictionPoints.length ? frictionPoints.map((f) => IMPROVEMENTS[f.category].why) : ["Not enough detail to identify causes."],
    frictionPoints,
    beforeSteps,
    afterSteps,
    currentMinutes: w.avgMinutes,
    improvedMinutes: round1(Math.max(0, w.avgMinutes - saved)),
    perWeek: w.perWeek,
    difficulty: hardest,
    limitations: [
      "Demo analysis: friction is detected by keyword patterns, not by understanding your business.",
      "Step durations are an even split of your stated total, weighted toward friction steps.",
      "Savings depend on actually adopting the suggestions.",
    ],
    nextAction: frictionPoints.length
      ? `Start with “${[...frictionPoints].sort((a, b) => b.minutesPerExecution - b.improvedMinutes - (a.minutesPerExecution - a.improvedMinutes))[0].improvement}”`
      : "Add more detail about each step and analyse again.",
    assumptions: BASE_ASSUMPTIONS(w),
  };
}

/* ------------------------------------------------------------------ */
/* Normalise AI output — all minutes derive from the user's own time   */
/* ------------------------------------------------------------------ */

export function normalizeAIAnalysis(
  ai: AIAnalysis,
  w: WorkflowInput,
  id: string,
  workflowId: string,
  source: AnalysisSource,
): Analysis {
  const shareTotal = ai.steps.reduce((a, s) => a + s.share, 0) || 1;
  const beforeSteps: WorkflowStep[] = ai.steps.map((s, i) => ({
    id: `${id}_b${i + 1}`,
    name: s.name,
    description: s.description,
    minutes: round1((s.share / shareTotal) * w.avgMinutes),
    friction: false,
  }));

  const frictionPoints: FrictionPoint[] = ai.frictionPoints.map((f, i) => {
    const linked = beforeSteps.filter((_, idx) => ai.steps[idx].frictionKey === f.key);
    const minutes = linked.length ? linked.reduce((a, s) => a + s.minutes, 0) : round1(w.avgMinutes / beforeSteps.length);
    const improved = round1(minutes * (1 - f.reductionPct / 100));
    const fid = `${id}_f${i + 1}`;
    linked.forEach((s) => {
      s.friction = true;
      s.frictionId = fid;
    });
    return {
      id: fid,
      stepId: linked[0]?.id,
      name: f.name,
      description: f.description,
      category: f.category,
      severity: f.severity,
      frequencyPerWeek: w.perWeek,
      minutesPerExecution: round1(minutes),
      improvedMinutes: improved,
      why: f.why,
      improvement: f.improvement,
      difficulty: f.difficulty,
      confidence: f.confidence,
      evidence: f.evidence,
    };
  });

  const saved = frictionPoints.reduce((a, f) => a + (f.minutesPerExecution - f.improvedMinutes), 0);
  const improvedMinutes = round1(Math.max(0, Math.min(w.avgMinutes, w.avgMinutes - saved)));
  const impShare = ai.improvedSteps.reduce((a, s) => a + s.share, 0) || 1;
  const afterSteps: WorkflowStep[] = ai.improvedSteps.map((s, i) => ({
    id: `${id}_a${i + 1}`,
    name: s.name,
    description: s.description,
    minutes: round1((s.share / impShare) * improvedMinutes),
    friction: false,
  }));

  return {
    id,
    workflowId,
    createdAt: new Date().toISOString(),
    source,
    summary: ai.summary,
    causes: ai.causes,
    frictionPoints,
    beforeSteps,
    afterSteps,
    currentMinutes: w.avgMinutes,
    improvedMinutes,
    perWeek: w.perWeek,
    difficulty: ai.difficulty,
    limitations: ai.limitations,
    nextAction: ai.nextAction,
    assumptions: [...BASE_ASSUMPTIONS(w), ...ai.assumptions],
  };
}

export function weeklySavedMinutes(a: Pick<Analysis, "currentMinutes" | "improvedMinutes" | "perWeek">): number {
  return Math.max(0, a.currentMinutes - a.improvedMinutes) * a.perWeek;
}

export function sourceLabel(s: AnalysisSource): string {
  if (s.kind === "ai") return `AI analysis · ${s.provider}`;
  if (s.kind === "sample") return "Sample Analysis";
  return "Sample Analysis · rule-based demo";
}
