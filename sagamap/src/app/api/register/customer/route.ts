import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { parseBody, isUniqueViolation } from "@/lib/http";
import { customerRegisterSchema } from "@/lib/schemas";
import { recordReferral } from "@/lib/referral";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseBody(req, customerRegisterSchema);
  if (!body.ok) return body.response;
  const d = body.data;

  let customer: { id: number } | null;
  try {
    customer = await queryOne<{ id: number }>(
      "INSERT INTO customers (name, email, password_hash, interests) VALUES ($1, $2, $3, $4) RETURNING id",
      [d.name, d.email, await bcrypt.hash(d.password, 10), d.interests],
    );
  } catch (e) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
    throw e;
  }

  // 紹介リンク（/ref?biz_id=）経由なら紹介として記録
  const refBizId = d.ref ?? Number(cookies().get("sagamap_ref")?.value);
  if (customer && refBizId) await recordReferral(customer.id, refBizId);

  const res = NextResponse.json({ customerId: customer!.id }, { status: 201 });
  res.cookies.delete("sagamap_ref");
  return res;
}
