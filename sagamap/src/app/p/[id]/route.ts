import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * レジ横 QR ポスターのリンク: /p/123
 *  - 会員（ログイン中）→ そのお店のページ（クーポンをすぐ使える）
 *  - まだの方 → 紹介元をこのお店にして会員登録へ。登録が終わるとそのお店のページが開く
 * 読み取り回数は事業主のダッシュボード・月次レポートに出す（同じ人の連続読み取りは 1 時間に 1 回）。
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = Number(params.id);
  const shop = Number.isInteger(id) && id > 0 ? await queryOne<{ id: number }>("SELECT id FROM businesses WHERE id = $1", [id]) : null;
  if (!shop) return NextResponse.redirect(new URL("/", req.nextUrl.origin));

  const user = await getSessionUser();
  const who = user?.role === "customer" ? `c${user.id}` : clientIp(req.headers);
  const rl = await rateLimit(`qr:${id}:${who}`, 1, 60 * 60);
  if (rl.ok && user?.role !== "business" && user?.role !== "admin") {
    await query("INSERT INTO shop_events (business_id, customer_id, kind) VALUES ($1, $2, 'qr_scan')", [id, user?.role === "customer" ? user.id : null]);
  }

  const shopPage = `/?shop=${id}`;
  if (user) return NextResponse.redirect(new URL(shopPage, req.nextUrl.origin));
  const target = new URL("/register/customer", req.nextUrl.origin);
  target.searchParams.set("ref", String(id));
  target.searchParams.set("next", shopPage);
  const res = NextResponse.redirect(target);
  res.cookies.set("sagamap_ref", String(id), { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
