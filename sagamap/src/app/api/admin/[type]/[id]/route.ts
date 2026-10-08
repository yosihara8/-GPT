import { NextResponse } from "next/server";
import { z } from "zod";
import { pool, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: { type: string; id: string } };

const DELETE_TARGETS: Record<string, { table: string; label: string; nameSql: string }> = {
  owners: { table: "business_owners", label: "事業者", nameSql: "email" },
  stores: { table: "businesses", label: "店舗", nameSql: "name" },
  customers: { table: "customers", label: "顧客", nameSql: "email" },
};

/** 削除（迷惑な登録の削除など）。事業者を削除するとその店舗・クーポン・広告も削除される */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const target = DELETE_TARGETS[params.type];
  const id = Number(params.id);
  if (!target || !Number.isInteger(id)) return NextResponse.json({ error: "対象が不正です" }, { status: 400 });

  const row = await queryOne<{ name: string }>(
    `DELETE FROM ${target.table} WHERE id = $1 RETURNING ${target.nameSql} AS name`,
    [id],
  );
  if (!row) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  await auditLog(auth.user.id, `${target.label}を削除`, `${params.type}#${id}`, row.name);
  return NextResponse.json({ ok: true });
}

const planSchema = z.object({ plan: z.enum(["free", "premium"]) });

/** 事業者のプランを手動で変更（Stripe を使わない請求書払いなどの場合） */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  if (params.type !== "owners") return NextResponse.json({ error: "変更できない対象です" }, { status: 400 });
  const body = await parseBody(req, planSchema);
  if (!body.ok) return body.response;
  const id = Number(params.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query<{ email: string }>(
      "UPDATE business_owners SET plan = $1 WHERE id = $2 RETURNING email",
      [body.data.plan, id],
    );
    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    await client.query("UPDATE businesses SET is_premium = $1 WHERE owner_id = $2", [body.data.plan === "premium", id]);
    await client.query("COMMIT");
    await auditLog(auth.user.id, "プランを変更", `owners#${id}`, `${res.rows[0].email} → ${body.data.plan}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
