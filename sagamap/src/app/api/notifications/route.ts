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

/** 既読にする（見た時点で自動で呼ぶ）。ids があればそのお知らせだけ、なければすべて */
export async function PATCH(req: Request) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isInteger).slice(0, 100) : null;
  if (ids) {
    await query("UPDATE notifications SET read_at = now() WHERE customer_id = $1 AND read_at IS NULL AND id = ANY($2::bigint[])", [auth.user.id, ids]);
  } else {
    await query("UPDATE notifications SET read_at = now() WHERE customer_id = $1 AND read_at IS NULL", [auth.user.id]);
  }
  return NextResponse.json({ ok: true });
}

/** お知らせを消す: ?id=（1 件）または ?read=1&keep=…（読んだものすべて） */
export async function DELETE(req: Request) {
  const auth = await requireApiUser("customer");
  if (!auth.ok) return auth.response;
  const sp = new URL(req.url).searchParams;
  if (sp.get("read") === "1") {
    // keep= は今見ている「新着」（見た時点で既読になっている）。それ以外の読んだお知らせを消す
    const keep = (sp.get("keep") ?? "").split(",").map(Number).filter(Number.isInteger);
    await query("DELETE FROM notifications WHERE customer_id = $1 AND read_at IS NOT NULL AND NOT (id = ANY($2::bigint[]))", [auth.user.id, keep]);
  } else {
    const id = Number(sp.get("id"));
    if (!Number.isInteger(id)) return NextResponse.json({ error: "お知らせが見つかりません" }, { status: 400 });
    await query("DELETE FROM notifications WHERE customer_id = $1 AND id = $2", [auth.user.id, id]);
  }
  return NextResponse.json({ ok: true });
}
