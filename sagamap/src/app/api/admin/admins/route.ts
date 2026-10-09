import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody, isUniqueViolation } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/session";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const admins = await query("SELECT id, name, email, created_at FROM admins ORDER BY id");
  return NextResponse.json({ admins });
}

const schema = z.object({
  name: z.string().trim().min(1, "名前は必須です").max(50),
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(12, "運営者のパスワードは 12 文字以上にしてください").max(128),
});

/** 運営者を追加する（運営者のみ） */
export async function POST(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const d = body.data;
  try {
    const row = await queryOne<{ id: number }>(
      "INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [d.name, d.email, await bcrypt.hash(d.password, 12)],
    );
    await auditLog(auth.user.id, "運営者を追加", `admins#${row!.id}`, d.email);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return NextResponse.json({ error: "このメールアドレスは登録済みです" }, { status: 409 });
    await logServerError("admin/admins", e);
    throw e;
  }
}
