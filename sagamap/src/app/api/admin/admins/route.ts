import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 運営者の一覧（運営者は 1 人だけ。追加はできない） */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const admins = await query("SELECT id, name, email, created_at FROM admins ORDER BY id");
  return NextResponse.json({ admins });
}
