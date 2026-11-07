import { NextResponse } from "next/server";
import { checkFounder } from "@/lib/founder";

export async function GET(req: Request) {
  const r = await checkFounder(req);
  return NextResponse.json(r, { status: r.ok ? 200 : 401 });
}
