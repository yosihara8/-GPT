import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { mailEnabled, sendMail } from "@/lib/mail";
import { OPERATOR } from "@/lib/config";
import { buildOwnerReport, prevMonth, reportHtml, thisMonth } from "@/lib/owner-report";

export const dynamic = "force-dynamic";

/** 月次レポート（事業主）。?month=YYYY-MM（省略時は先月）。今月は途中経過 */
export async function GET(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const q = new URL(req.url).searchParams.get("month");
  const month = q && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) && q <= thisMonth() ? q : prevMonth(thisMonth());
  const report = await buildOwnerReport(auth.user.id, month);
  const owner = await queryOne<{ report_enabled: boolean }>("SELECT report_enabled FROM business_owners WHERE id = $1", [auth.user.id]);
  return NextResponse.json({ report, enabled: owner?.report_enabled ?? true, current: thisMonth() });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setting"), enabled: z.boolean() }),
  z.object({ action: z.literal("test"), month: z.string().regex(/^\d{4}-\d{2}$/) }),
]);

/** メールの受け取り設定・自分あてにテスト送信 */
export async function POST(req: Request) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  if (body.data.action === "setting") {
    await query("UPDATE business_owners SET report_enabled = $1 WHERE id = $2", [body.data.enabled, auth.user.id]);
    return NextResponse.json({ ok: true });
  }
  if (!mailEnabled()) return NextResponse.json({ error: "メールの送信がまだ設定されていません" }, { status: 503 });
  const rl = await rateLimit(`report-test:${auth.user.id}`, 3, 24 * 60 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const r = await buildOwnerReport(auth.user.id, body.data.month);
  if (!r) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  await sendMail(r.email, `【${OPERATOR.serviceName}】${r.label}のレポート（お試し送信）`, reportHtml(r));
  return NextResponse.json({ ok: true, to: r.email });
}
