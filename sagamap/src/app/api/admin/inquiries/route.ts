import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { INQUIRY_STATUS } from "@/lib/inquiry";

export const dynamic = "force-dynamic";

/** お問い合わせの一覧: GET /api/admin/inquiries?status=new */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const status = req.nextUrl.searchParams.get("status");
  const rows = await query(
    `SELECT id, role, user_id, name, email, category, body, status, admin_note, created_at, updated_at
       FROM inquiries WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC LIMIT 500`,
    [status && status in INQUIRY_STATUS ? status : null],
  );
  const counts = await queryOne<{ new: number; in_progress: number; done: number }>(
    `SELECT count(*) FILTER (WHERE status = 'new')::int AS new, count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
            count(*) FILTER (WHERE status = 'done')::int AS done FROM inquiries`,
  );
  return NextResponse.json({ inquiries: rows, counts });
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["new", "in_progress", "done"]).optional(),
  adminNote: z.string().max(2000).optional(),
});

/** 対応状況・メモの更新 */
export async function PATCH(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;
  const d = body.data;
  const row = await queryOne<{ id: number }>(
    `UPDATE inquiries SET status = COALESCE($2, status), admin_note = COALESCE($3, admin_note), updated_at = now() WHERE id = $1 RETURNING id`,
    [d.id, d.status ?? null, d.adminNote ?? null],
  );
  if (!row) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (d.status) await auditLog(auth.user.id, "お問い合わせの対応状況を変更", `inquiries#${d.id}`, INQUIRY_STATUS[d.status]);
  return NextResponse.json({ ok: true });
}
