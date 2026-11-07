// Core domain types for Infinity ZERO.

export const FRICTION_CATEGORIES = [
  "repetitive_manual",
  "unnecessary_approvals",
  "duplicate_entry",
  "info_searching",
  "communication_delays",
  "manual_scheduling",
  "repeated_responses",
  "disconnected_tools",
] as const;
export type FrictionCategory = (typeof FRICTION_CATEGORIES)[number];

export const FRICTION_CATEGORY_LABELS: Record<FrictionCategory, string> = {
  repetitive_manual: "Repetitive manual work",
  unnecessary_approvals: "Unnecessary approvals",
  duplicate_entry: "Duplicate data entry",
  info_searching: "Information searching",
  communication_delays: "Communication delays",
  manual_scheduling: "Manual scheduling",
  repeated_responses: "Repeated customer responses",
  disconnected_tools: "Disconnected software tools",
};

export type Level = "low" | "medium" | "high";
export type Difficulty = "easy" | "moderate" | "hard";

export const BUSINESS_CATEGORIES = [
  "Fitness & wellness",
  "Freelance & consulting",
  "Education & study",
  "Retail & e-commerce",
  "Professional services",
  "Hospitality & food",
  "Healthcare",
  "Real estate",
  "Corporate / employee",
  "Other",
] as const;

export interface Workflow {
  id: string;
  title: string;
  category: string;
  description: string;
  perWeek: number;
  avgMinutes: number;
  steps: string[];
  notes: string;
  createdAt: string;
  sampleId?: string; // set when the workflow came from a built-in sample scenario
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  minutes: number;
  friction: boolean;
  frictionId?: string;
}

export interface FrictionPoint {
  id: string;
  name: string;
  description: string;
  category: FrictionCategory;
  severity: Level;
  frequencyPerWeek: number;
  minutesPerExecution: number; // estimated time this friction costs each run
  improvedMinutes: number; // estimated time after improvement each run
  why: string;
  improvement: string;
  difficulty: Difficulty;
  confidence: Level;
  evidence: string; // what in the user's own description this is based on
  stepId?: string;
}

export type AnalysisSource =
  | { kind: "ai"; provider: string; model: string }
  | { kind: "sample"; sampleId: string }
  | { kind: "rules" };

export interface Analysis {
  id: string;
  workflowId: string;
  createdAt: string;
  source: AnalysisSource;
  summary: string;
  causes: string[];
  frictionPoints: FrictionPoint[];
  beforeSteps: WorkflowStep[];
  afterSteps: WorkflowStep[];
  currentMinutes: number;
  improvedMinutes: number;
  perWeek: number;
  difficulty: Difficulty;
  limitations: string[];
  nextAction: string;
  assumptions: string[];
}

export type PlanStatus = "proposed" | "accepted" | "rejected" | "implemented";

export interface SimulatorInputs {
  perWeek: number;
  currentMinutes: number;
  improvedMinutes: number;
  implementationCost: number; // one-off hours of setup effort
  hourlyValue: number | null; // ₹ per hour, optional
}

export interface ImprovementPlan {
  id: string;
  analysisId: string;
  workflowId: string;
  title: string;
  status: PlanStatus;
  frictionDecisions: Record<string, "accepted" | "rejected">;
  inputs: SimulatorInputs;
  createdAt: string;
  updatedAt: string;
  implementedAt?: string;
}

export interface Measurement {
  id: string;
  planId: string;
  beforeMinutes: number;
  afterMinutes: number;
  executionsMeasured: number;
  notes: string;
  measuredAt: string;
}

export const RESPONDENT_TYPES = [
  "Business owner",
  "Freelancer",
  "Student",
  "Employee",
  "Other",
] as const;
export type RespondentType = (typeof RESPONDENT_TYPES)[number];

export type Usefulness = "yes" | "possibly" | "no";
export type Rating = "excellent" | "good" | "needs_improvement";
export type PayIntent = "yes" | "maybe" | "no";

export const PRICE_RANGES = [
  "Under ₹199",
  "₹199 – ₹499",
  "₹500 – ₹999",
  "₹1,000 – ₹2,499",
  "₹2,500+",
] as const;

export interface FeedbackResponse {
  id: string;
  submissionKey: string; // idempotency key, prevents duplicate submissions
  respondentType: RespondentType | null;
  experience: string;
  usefulness: Usefulness;
  usefulnessDetail: string;
  rating: Rating;
  improvementDetail: string;
  timeConsumingTask: string;
  featureWish: string;
  payIntent: PayIntent | null;
  priceRange: string | null;
  source: "feedback_page" | "live_demo";
  createdAt: string;
  storage: "supabase" | "local";
}

export const PLAN_IDS = ["free", "personal", "professional", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PricingInterest {
  id: string;
  plan: PlanId;
  respondentType: RespondentType | null;
  name: string;
  email: string;
  note: string;
  createdAt: string;
  storage: "supabase" | "local";
}

export interface ValidationThresholds {
  minResponses: number;
  promisingUsefulPct: number; // % "yes, definitely"
  promisingPayPct: number; // % yes + maybe for paying
  lowInterestUsefulPct: number; // below this "useful (yes+possibly)" = low interest
}

export const DEFAULT_THRESHOLDS: ValidationThresholds = {
  minResponses: 20,
  promisingUsefulPct: 40,
  promisingPayPct: 30,
  lowInterestUsefulPct: 35,
};
