import { Cpu, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sourceLabel } from "@/lib/analysis";
import type { AnalysisSource } from "@/lib/types";

export function SourceBadge({ source }: { source: AnalysisSource }) {
  if (source.kind === "ai")
    return (
      <Badge tone="cyan" title={`Model: ${source.model}`}>
        <Cpu /> {sourceLabel(source)}
      </Badge>
    );
  return (
    <Badge tone="amber" title="Prewritten or rule-based demonstration — not live AI analysis">
      <FlaskConical /> {sourceLabel(source)}
    </Badge>
  );
}

export function EstimateBadge() {
  return <Badge tone="violet">Estimate</Badge>;
}
