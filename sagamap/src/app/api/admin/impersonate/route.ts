import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { createToken } from "@/lib/tokens";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ type: z.enum(["owners", "customers"]), id: z.coerce.number().int().positive() });

/** 管理者が事業者・お客さまの画面を見るための代理ログイン用トークン（1 回限り・2 分間有効） */
export async function POST(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const { type, id } = body.data;
  const table = type === "owners" ? "business_owners" : "customers";
  const user = await queryOne<{ email: string }>(`SELECT email FROM ${table} WHERE id = $1`, [id]);
  if (!user) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  const role = type === "owners" ? "business" : "customer";
  const token = await createToken("impersonate", role, id, 2);
  await auditLog(auth.user.id, "代理ログイン", `${type}#${id}`, user.email);
  return NextResponse.json({
    token,
    role,
    redirect: role === "business" ? "/dashboard/business" : "/dashboard/customer",
  });
}
