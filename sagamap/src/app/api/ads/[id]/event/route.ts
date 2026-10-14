import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * 広告の表示・タップを記録する（事業主向けの統計）。
 * 同じ人の同じ広告は、表示は 30 分に 1 回、タップは 5 分に 1 回だけ数える。
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
 const params = await props.params;
 const adId = Number(params.id);
 const { kind } = (await req.json().catch(() => ({}))) as { kind?: string };
 if (kind !== "view" && kind !== "click") return NextResponse.json({ error: "kind が正しくありません" }, { status: 400 });

 const user = await getSessionUser();
 const customerId = user?.role === "customer" && !user.impersonated ? user.id : null;
 // 事業主・運営者（代理ログイン中を含む）の閲覧は数えない
 if (user && !customerId) return NextResponse.json({ ok: true, counted: false });

 const who = customerId ? `c${customerId}` : clientIp(req.headers);
 const rl = await rateLimit(`ad-${kind}:${adId}:${who}`, 1, kind === "view" ? 30 * 60 : 5 * 60);
 if (!rl.ok) return NextResponse.json({ ok: true, counted: false });

 const ad = await queryOne("SELECT 1 FROM ads WHERE id = $1 AND is_active AND now() BETWEEN starts_at AND ends_at", [adId]);
 if (!ad) return NextResponse.json({ ok: true, counted: false });
 await query("INSERT INTO ad_events (ad_id, kind, customer_id) VALUES ($1, $2, $3)", [adId, kind, customerId]);
 return NextResponse.json({ ok: true, counted: true });
}
