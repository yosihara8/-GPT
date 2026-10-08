import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** 運営者がまだ 1 人もいないか */
export async function GET() {
  const row = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM admins");
  return NextResponse.json({ needed: (row?.n ?? 0) === 0 });
}

const schema = z.object({
  name: z.string().trim().min(1, "名前は必須です").max(50),
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(12, "運営者のパスワードは 12 文字以上にしてください").max(128),
});

/** 最初の運営者を作成する。運営者が 1 人でもいれば受け付けない */
export async function POST(req: Request) {
  const rl = await rateLimit(`admin-setup:${clientIp(req.headers)}`, 5, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const d = body.data;

  // 同時に 2 件作られないよう、存在チェックと作成を 1 文で行う
  const row = await queryOne<{ id: number }>(
    `INSERT INTO admins (name, email, password_hash)
     SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM admins) RETURNING id`,
    [d.name, d.email, await bcrypt.hash(d.password, 12)],
  );
  if (!row) return NextResponse.json({ error: "運営者はすでに登録されています" }, { status: 403 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
