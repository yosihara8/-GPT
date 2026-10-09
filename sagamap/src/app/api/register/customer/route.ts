import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { parseBody, isUniqueViolation } from "@/lib/http";
import { customerRegisterSchema } from "@/lib/schemas";
import { recordReferral } from "@/lib/referral";
import { sendVerificationMail } from "@/lib/account-mail";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 同じ接続元からの大量登録を防ぐ（1 時間に 10 件まで）
  const rl = await rateLimit(`register:${clientIp(req.headers)}`, 10, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, customerRegisterSchema);
  if (!body.ok) return body.response;
  const d = body.data;

  let customer: { id: number } | null;
  try {
    customer = await queryOne<{ id: number }>(
      "INSERT INTO customers (name, email, password_hash, interests, notify_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [d.name, d.email, await bcrypt.hash(d.password, 10), d.interests, d.notifyEnabled],
    );
  } catch (e) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
    await logServerError("register/customer", e);
    throw e;
  }

  // 紹介リンク（/ref?biz_id=）経由なら紹介として記録
  const refBizId = d.ref ?? Number(cookies().get("sagamap_ref")?.value);
  if (customer && refBizId) await recordReferral(customer.id, refBizId);
  if (customer) {
    await sendVerificationMail("customer", customer.id, d.email, d.name).catch((e) =>
      logServerError("register/customer:verify-mail", e),
    );
  }

  const res = NextResponse.json({ customerId: customer!.id }, { status: 201 });
  res.cookies.delete("sagamap_ref");
  return res;
}
