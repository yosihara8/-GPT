import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ kind: z.enum(["route", "call", "save", "share", "coupon_view"]) });

/**
 * お客さまの行動を記録する（事業主の統計用）。
 * 会員のお客さまだけを数え、同じ人の同じ行動は 1 時間に 1 回まで（事業主・運営者は数えない）
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const user = await getSessionUser();
  if (user?.role !== "customer" || user.impersonated) return NextResponse.json({ ok: true, counted: false });
  const id = Number(params.id);
  const recent = await queryOne(
    `SELECT 1 FROM shop_events WHERE business_id = $1 AND customer_id = $2 AND kind = $3 AND created_at > now() - interval '1 hour'`,
    [id, user.id, body.data.kind],
  );
  if (recent) return NextResponse.json({ ok: true, counted: false });
  await query(
    `INSERT INTO shop_events (business_id, customer_id, kind) SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM businesses WHERE id = $1)`,
    [id, user.id, body.data.kind],
  );
  return NextResponse.json({ ok: true, counted: true });
}
