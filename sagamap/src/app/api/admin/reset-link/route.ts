import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { createResetUrl } from "@/lib/account-mail";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ type: z.enum(["owners", "customers"]), id: z.coerce.number().int().positive() });

/** 運営者がパスワード再設定リンクを発行する（メール送信が未設定でも、本人に直接伝えられる） */
export async function POST(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const { type, id } = body.data;
  const table = type === "owners" ? "business_owners" : "customers";
  const user = await queryOne<{ email: string }>(`SELECT email FROM ${table} WHERE id = $1`, [id]);
  if (!user) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  const url = await createResetUrl(type === "owners" ? "business" : "customer", id, 24 * 60);
  await auditLog(auth.user.id, "再設定リンクを発行", `${type}#${id}`, user.email);
  return NextResponse.json({ url, email: user.email });
}
