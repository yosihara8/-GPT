import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { PRICE_STANDARD } from "@/lib/config";
import { requireApiUser } from "@/lib/session";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/leave-special  { confirm: true }
 * 特別招待プランをやめて無料プランにする。一度やめると特別招待プランには戻れない（取り消し不可）。
 */
export async function POST(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== true) return NextResponse.json({ error: "確認のチェックを入れてください" }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `UPDATE business_owners
          SET complimentary = false, plan = 'free', monthly_price = $2, plan_ends_at = NULL,
              special_ended_at = COALESCE(special_ended_at, now())
        WHERE id = $1 AND complimentary`,
      [auth.user.id, PRICE_STANDARD],
    );
    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "特別招待プランをご利用中ではありません" }, { status: 400 });
    }
    await client.query("UPDATE businesses SET is_premium = false WHERE owner_id = $1", [auth.user.id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    await logServerError("billing/leave-special", e);
    throw e;
  } finally {
    client.release();
  }
}
