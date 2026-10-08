import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { APP_URL } from "@/lib/config";
import { sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * 週 1 回のクーポン・イベント通知。
 * Vercel Cron / GitHub Actions などから
 *   Authorization: Bearer $CRON_SECRET
 * を付けて呼び出す。
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const coupons = await query<{ id: number; title: string; discount_rate: number; business_name: string; category: string }>(
    `SELECT c.id, c.title, c.discount_rate, b.name AS business_name, b.category
       FROM coupons c JOIN businesses b ON b.id = c.business_id
      WHERE c.is_active AND c.expires_at > now() AND c.created_at > now() - interval '7 days'
      ORDER BY c.created_at DESC`,
  );
  if (coupons.length === 0) return NextResponse.json({ sent: 0, reason: "新着クーポンなし" });

  const customers = await query<{ id: number; name: string; email: string; interests: string[]; unsubscribe_token: string }>(
    "SELECT id, name, email, interests, unsubscribe_token FROM customers WHERE notify_enabled",
  );

  let sent = 0;
  for (const c of customers) {
    // 興味業種があれば優先して並べる
    const sorted = [...coupons].sort(
      (a, b) => Number(c.interests.includes(b.category)) - Number(c.interests.includes(a.category)),
    );
    const top = sorted.slice(0, 5);
    const title = `今週の新着クーポン ${coupons.length} 件`;
    const body = top.map((x) => `${x.business_name}: ${x.title}（${x.discount_rate}% OFF）`).join("\n");

    await query("INSERT INTO notifications (customer_id, title, body, link) VALUES ($1, $2, $3, $4)", [
      c.id,
      title,
      body,
      `/dashboard/customer/coupons/${top[0].id}`,
    ]);

    const items = top
      .map(
        (x) =>
          `<li><a href="${APP_URL}/dashboard/customer/coupons/${x.id}">${escapeHtml(x.business_name)}：${escapeHtml(x.title)}（${x.discount_rate}% OFF）</a></li>`,
      )
      .join("");
    try {
      await sendMail(
        c.email,
        `【SagaMap】${title}`,
        `<p>${escapeHtml(c.name)} さん</p><p>今週、佐賀で新しいクーポンが届きました。</p><ul>${items}</ul>
         <p><a href="${APP_URL}/dashboard/customer">地図で近くのお店を見る</a></p>
         <p style="font-size:12px;color:#888"><a href="${APP_URL}/unsubscribe?token=${c.unsubscribe_token}">配信停止</a></p>`,
      );
      sent++;
    } catch (e) {
      console.error(`weekly-digest: failed for customer ${c.id}`, e);
    }
  }
  return NextResponse.json({ sent, coupons: coupons.length });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
