import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export const metadata: Metadata = { title: "Customer Feedback" };

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Customer Validation</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Help Shape the Future of <span className="text-gradient">Infinity ZERO</span></h1>
        <p className="mt-3 text-muted">Your feedback will help us build a product that solves real problems.</p>
      </div>
      <Card glow>
        <CardContent className="p-5 sm:p-8">
          <FeedbackForm source="feedback_page" />
        </CardContent>
      </Card>
    </div>
  );
}
