import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { parseBody, isUniqueViolation } from "@/lib/http";
import { businessRegisterSchema } from "@/lib/schemas";
import { ADDRESS_NOT_FOUND, geocodeAddress } from "@/lib/geocode";
import { sendVerificationMail } from "@/lib/account-mail";
import { logServerError } from "@/lib/server-error";

export const dynamic = "force-dynamic";

/** 事業主登録（無料プラン）: アカウントと 1 店舗目を同時に作成 */
export async function POST(req: Request) {
  // 同じ接続元からの大量登録を防ぐ（1 時間に 10 件まで）
  const rl = await rateLimit(`register:${clientIp(req.headers)}`, 10, 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, businessRegisterSchema);
  if (!body.ok) return body.response;
  const d = body.data;

  const pos = await geocodeAddress(d.address);
  if (!pos) return NextResponse.json({ error: ADDRESS_NOT_FOUND, field: "address" }, { status: 422 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query<{ id: number }>(
      "INSERT INTO business_owners (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [d.name, d.email, await bcrypt.hash(d.password, 10)],
    );
    const biz = await client.query<{ id: number }>(
      `INSERT INTO businesses (owner_id, name, address, lat, lng, category, service_description, contact, price_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [owner.rows[0].id, d.name, d.address, pos.lat, pos.lng, d.category, d.serviceDescription, d.contact, d.priceLevel],
    );
    await client.query("COMMIT");
    await sendVerificationMail("business", owner.rows[0].id, d.email, d.name).catch((e) =>
      logServerError("register/business:verify-mail", e),
    );
    return NextResponse.json({ ownerId: owner.rows[0].id, businessId: biz.rows[0].id, matched: pos.matched }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }
    await logServerError("register/business", e);
    throw e;
  } finally {
    client.release();
  }
}
