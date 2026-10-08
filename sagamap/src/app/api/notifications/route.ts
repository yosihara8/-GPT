import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const rows = await query(
    "SELECT id, title, body, link, created_at, read_at FROM notifications WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50",
    [auth.user.id],
  );
  return NextResponse.json({ notifications: rows });
}

/** 通知をすべて既読にする */
export async function PATCH() {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  await query("UPDATE notifications SET read_at = now() WHERE customer_id = $1 AND read_at IS NULL", [auth.user.id]);
  return NextResponse.json({ ok: true });
}
