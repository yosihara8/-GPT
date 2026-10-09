import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ACCOUNT_TABLE } from "@/lib/accounts";
import { sendVerificationMail } from "@/lib/account-mail";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 確認メールの再送（1 時間に 3 回まで） */
export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id, role } = auth.user;
  if (role === "admin") return NextResponse.json({ ok: true });
  const rl = await rateLimit(`verify-resend:${role}:${id}`, 3, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const row = await queryOne<{ name: string; email: string }>(`SELECT name, email FROM ${ACCOUNT_TABLE[role]} WHERE id = $1`, [id]);
  if (row) await sendVerificationMail(role, id, row.email, row.name);
  return NextResponse.json({ ok: true });
}
