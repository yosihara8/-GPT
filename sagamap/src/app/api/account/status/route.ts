import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ACCOUNT_TABLE } from "@/lib/accounts";
import { mailEnabled } from "@/lib/mail";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  if (auth.user.role === "admin") return NextResponse.json({ emailVerified: true, mailEnabled: mailEnabled() });
  const row = await queryOne<{ verified: boolean }>(
    `SELECT email_verified_at IS NOT NULL AS verified FROM ${ACCOUNT_TABLE[auth.user.role]} WHERE id = $1`,
    [auth.user.id],
  );
  return NextResponse.json({ emailVerified: Boolean(row?.verified), mailEnabled: mailEnabled() });
}
