import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** お知らせメール（週 1 回）の受信設定 */
export async function GET() {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const row = await queryOne<{ notify_enabled: boolean }>("SELECT notify_enabled FROM customers WHERE id = $1", [auth.user.id]);
  return NextResponse.json({ notifyEnabled: Boolean(row?.notify_enabled) });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, z.object({ notifyEnabled: z.boolean() }));
  if (!body.ok) return body.response;
  await query("UPDATE customers SET notify_enabled = $1 WHERE id = $2", [body.data.notifyEnabled, auth.user.id]);
  return NextResponse.json({ ok: true });
}
