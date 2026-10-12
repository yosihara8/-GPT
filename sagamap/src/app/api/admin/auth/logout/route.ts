import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** 管理画面からログアウト（お客さま・事業主のログインには影響しない） */
export async function POST() {
  return clearAdminCookie(NextResponse.json({ ok: true }));
}
