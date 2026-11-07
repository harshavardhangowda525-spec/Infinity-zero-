import { NextResponse } from "next/server";
import { configuredProviders } from "@/lib/ai/providers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { passcodeConfigured } from "@/lib/founder";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    aiProviders: configuredProviders().map((p) => ({ id: p.id, name: p.name, model: p.model })),
    supabase: isSupabaseConfigured(),
    founderPasscode: passcodeConfigured(),
  });
}
