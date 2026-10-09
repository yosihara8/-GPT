import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { APP_URL } from "@/lib/config";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 読み間違えにくい文字だけで 10 文字の招待コードを作る */
function newCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...randomBytes(10)].map((b) => chars[b % chars.length]).join("");
}

const inviteUrl = (code: string) => `${APP_URL}/register/special?code=${code}`;

/** 特別招待リンクの一覧 */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const rows = await query<{ code: string }>(
    `SELECT i.id, i.code, i.label, i.max_uses, i.used_count, i.expires_at, i.is_active, i.created_at,
            (i.is_active AND i.used_count < i.max_uses AND (i.expires_at IS NULL OR i.expires_at > now())) AS usable,
            coalesce((SELECT string_agg(o.email, '、') FROM business_owners o WHERE o.invite_code_id = i.id), '') AS used_by
       FROM invite_codes i ORDER BY i.created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ invites: rows.map((r) => ({ ...r, url: inviteUrl(r.code) })) });
}

const createSchema = z.object({
  label: z.string().trim().max(60).default(""),
  maxUses: z.coerce.number().int().min(1).max(100).default(1),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/** 特別招待リンクの発行（有料プランを無料で使える事業者登録用） */
export async function POST(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;
  const d = body.data;
  const row = await queryOne<{ id: number; code: string }>(
    `INSERT INTO invite_codes (code, label, max_uses, expires_at, created_by)
     VALUES ($1, $2, $3, now() + make_interval(days => $4), $5) RETURNING id, code`,
    [newCode(), d.label ?? "", d.maxUses ?? 1, d.days ?? 30, auth.user.id],
  );
  await auditLog(auth.user.id, "特別招待リンクを発行", `invites#${row!.id}`, `${d.label ?? ""}（${d.maxUses ?? 1} 人まで・${d.days ?? 30} 日間）`);
  return NextResponse.json({ code: row!.code, url: inviteUrl(row!.code) }, { status: 201 });
}

/** 特別招待リンクの停止: PATCH /api/admin/invites?id= */
export async function PATCH(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const id = Number(new URL(req.url).searchParams.get("id"));
  const row = await queryOne<{ code: string }>("UPDATE invite_codes SET is_active = false WHERE id = $1 RETURNING code", [id]);
  if (!row) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  await auditLog(auth.user.id, "特別招待リンクを停止", `invites#${id}`, row.code);
  return NextResponse.json({ ok: true });
}
