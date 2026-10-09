import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** ブラウザで起きたエラーの記録（同じ接続元から 10 分に 20 件まで） */
export async function POST(req: Request) {
  const rl = await rateLimit(`errors:${clientIp(req.headers)}`, 20, 10 * 60);
  if (!rl.ok) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { message?: unknown; stack?: unknown; url?: unknown } | null;
  if (!body || typeof body.message !== "string" || !body.message) return new NextResponse(null, { status: 204 });
  await query("INSERT INTO error_logs (source, message, stack, url, user_agent) VALUES ('browser', $1, $2, $3, $4)", [
    body.message.slice(0, 1000),
    typeof body.stack === "string" ? body.stack.slice(0, 4000) : null,
    typeof body.url === "string" ? body.url.slice(0, 500) : null,
    (req.headers.get("user-agent") ?? "").slice(0, 300),
  ]);
  // 古い記録は 90 日で削除
  if (Math.random() < 0.02) await query("DELETE FROM error_logs WHERE created_at < now() - interval '90 days'");
  return new NextResponse(null, { status: 204 });
}
