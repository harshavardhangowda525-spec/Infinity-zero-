import "server-only";
import { timingSafeEqual } from "crypto";
import { getServerSupabase } from "./supabase/server";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passcodeConfigured() {
  return Boolean(process.env.FOUNDER_PASSCODE);
}

/**
 * Founder access is granted when either:
 *  - the request carries the FOUNDER_PASSCODE in the x-founder-passcode header, or
 *  - the signed-in Supabase user has profiles.role = 'founder'.
 * When neither a passcode nor Supabase is configured (pure local demo), access is
 * open because feedback only exists in that browser's local storage.
 */
export async function checkFounder(req: Request): Promise<{ ok: boolean; via?: "passcode" | "role" | "open-demo" }> {
  const pass = process.env.FOUNDER_PASSCODE;
  const header = req.headers.get("x-founder-passcode") || "";
  if (pass && header && safeEqual(pass, header)) return { ok: true, via: "passcode" };

  const supabase = await getServerSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profile?.role === "founder") return { ok: true, via: "role" };
    }
  }
  if (!pass && !supabase) return { ok: true, via: "open-demo" };
  return { ok: false };
}
