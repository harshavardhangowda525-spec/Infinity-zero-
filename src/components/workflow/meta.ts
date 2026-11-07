import type { Difficulty, Level } from "@/lib/types";

export const severityTone = (s: Level) => (s === "high" ? "danger" : s === "medium" ? "amber" : "neutral") as "danger" | "amber" | "neutral";
export const difficultyTone = (d: Difficulty) => (d === "easy" ? "success" : d === "moderate" ? "amber" : "danger") as "success" | "amber" | "danger";
export const confidenceTone = (c: Level) => (c === "high" ? "success" : c === "medium" ? "cyan" : "neutral") as "success" | "cyan" | "neutral";
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
