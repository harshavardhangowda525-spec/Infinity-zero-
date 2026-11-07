import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border [&_svg]:size-3", {
  variants: {
    tone: {
      cyan: "bg-cyan/10 text-cyan border-cyan/25",
      violet: "bg-violet/10 text-violet border-violet/30",
      royal: "bg-royal/10 text-[#8aa2ff] border-royal/30",
      amber: "bg-amber/10 text-amber border-amber/30",
      danger: "bg-danger/10 text-danger border-danger/30",
      success: "bg-success/10 text-success border-success/30",
      neutral: "bg-white/5 text-muted border-line",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
