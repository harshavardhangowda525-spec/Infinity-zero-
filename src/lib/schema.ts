import { z } from "zod";
import { FRICTION_CATEGORIES, PLAN_IDS, RESPONDENT_TYPES } from "./types";

export const workflowInputSchema = z.object({
  title: z.string().trim().min(3, "Give the workflow a short title").max(120),
  category: z.string().trim().min(1, "Choose a category").max(80),
  description: z
    .string()
    .trim()
    .min(30, "Describe the workflow in at least a sentence or two (30+ characters)")
    .max(3000),
  perWeek: z.coerce.number().min(0.25, "How often per week?").max(1000),
  avgMinutes: z.coerce.number().min(1, "Average minutes per run").max(2880),
  steps: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  notes: z.string().max(1000).default(""),
});
export type WorkflowInput = z.infer<typeof workflowInputSchema>;

const level = z.enum(["low", "medium", "high"]);
const difficulty = z.enum(["easy", "moderate", "hard"]);

/** Shape we ask AI models to return. Durations are proportions, not invented minutes. */
export const aiAnalysisSchema = z.object({
  summary: z.string().min(10).max(1200),
  causes: z.array(z.string().max(300)).min(1).max(8),
  steps: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(300).default(""),
        share: z.coerce.number().min(0).max(100), // % of the user's stated time
        frictionKey: z.string().max(40).nullish(),
      }),
    )
    .min(2)
    .max(12),
  improvedSteps: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(300).default(""),
        share: z.coerce.number().min(0).max(100), // % of the ORIGINAL total time
      }),
    )
    .min(1)
    .max(12),
  frictionPoints: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        name: z.string().min(1).max(100),
        description: z.string().max(400),
        category: z.enum(FRICTION_CATEGORIES),
        severity: level,
        reductionPct: z.coerce.number().min(0).max(95),
        why: z.string().max(500),
        improvement: z.string().max(500),
        difficulty,
        confidence: level,
        evidence: z.string().max(300),
      }),
    )
    .min(1)
    .max(10),
  difficulty,
  limitations: z.array(z.string().max(300)).min(1).max(8),
  nextAction: z.string().max(400),
  assumptions: z.array(z.string().max(300)).max(8).default([]),
});
export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;

export const analyzeRequestSchema = z.object({
  workflow: workflowInputSchema,
  sampleId: z.string().max(40).optional(),
  forceDemo: z.boolean().optional(),
});

export const feedbackSchema = z
  .object({
    submissionKey: z.string().min(8).max(80),
    respondentType: z.enum(RESPONDENT_TYPES).nullable(),
    experience: z.string().trim().max(2000).default(""),
    usefulness: z.enum(["yes", "possibly", "no"], { message: "Please choose how useful it would be" }),
    usefulnessDetail: z.string().trim().max(2000).default(""),
    rating: z.enum(["excellent", "good", "needs_improvement"], { message: "Please choose a rating" }),
    improvementDetail: z.string().trim().max(2000).default(""),
    timeConsumingTask: z.string().trim().max(1000).default(""),
    featureWish: z.string().trim().max(1000).default(""),
    payIntent: z.enum(["yes", "maybe", "no"]).nullable(),
    priceRange: z.string().max(40).nullable(),
    source: z.enum(["feedback_page", "live_demo"]),
  })
  .superRefine((v, ctx) => {
    if (v.rating === "needs_improvement" && v.improvementDetail.length < 3) {
      ctx.addIssue({ code: "custom", path: ["improvementDetail"], message: "Tell us what we should improve" });
    }
  });
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const pricingInterestSchema = z.object({
  plan: z.enum(PLAN_IDS),
  respondentType: z.enum(RESPONDENT_TYPES).nullable(),
  name: z.string().trim().max(100).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email or leave it blank")]).default(""),
  note: z.string().trim().max(1000).default(""),
});

export const summaryRequestSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string(),
        respondentType: z.string().nullable(),
        experience: z.string(),
        usefulness: z.string(),
        usefulnessDetail: z.string(),
        rating: z.string(),
        improvementDetail: z.string(),
        timeConsumingTask: z.string(),
        featureWish: z.string(),
        payIntent: z.string().nullable(),
      }),
    )
    .min(1)
    .max(300),
});

const cited = z.object({ point: z.string().max(400), entryIds: z.array(z.string()).min(1).max(30) });
export const feedbackSummarySchema = z.object({
  repeatedProblems: z.array(cited).max(8),
  requestedImprovements: z.array(cited).max(8),
  reasonsToUse: z.array(cited).max(8),
  reasonsToReject: z.array(cited).max(8),
  mvpPriorities: z.array(cited).max(6),
});
export type FeedbackSummary = z.infer<typeof feedbackSummarySchema>;
