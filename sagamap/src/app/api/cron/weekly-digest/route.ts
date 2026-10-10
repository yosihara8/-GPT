import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { APP_URL } from "@/lib/config";
import { escapeHtml } from "@/lib/escape";
import { mailEnabled, mailFooter, sendMailBatch, type MailMessage } from "@/lib/mail";
import { logServerError } from "@/lib/server-error";
import { isCronRequest } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Item = {
  kind: "coupon" | "ad";
  id: number;
  business_id: number;
  business_name: string;
  category: string;
  owner_id: number;
  owner_email: string;
  owner_name: string;
  title: string;
  detail: string;
};
type Customer = {
  id: number;
  name: string;
  email: string;
  unsubscribe_token: string;
  interests: string[];
  related: number[]; // 見た・使った・紹介で登録した店舗
};

/** 日本時間の「年-週」（同じ週に二重送信しないための目印） */
function weekKey(d = new Date()) {
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  const day = (jst.getUTCDay() + 6) % 7; // 月曜 = 0
  const monday = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/**
 * 週 1 回（毎週金曜 9:00 JST）の「今週の新着クーポン・広告」まとめメール。
 *  - お客さま: すべてのお客さま（配信停止中の方を除く）に、今週の新着をすべて 1 通にまとめて送る。
 *    興味のある業種・見た店・紹介元の店のお知らせは「あなたへのおすすめ」として先頭に載せる
 *  - 事業者: 自分のクーポン・広告が何人に届いたかの報告を 1 通
 * Vercel Cron が呼び出す。CRON_SECRET を設定している場合は Authorization: Bearer で認証する。
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 同じ週に 2 回送らない（手動の再実行や不正な呼び出しへの対策）
  const period = weekKey();
  const claimed = await queryOne("INSERT INTO job_runs (job, period) VALUES ('weekly-digest', $1) ON CONFLICT DO NOTHING RETURNING period", [period]);
  if (!claimed) return NextResponse.json({ skipped: true, reason: `今週（${period} の週）は送信済みです` });

  try {
    const result = await runDigest();
    await query("UPDATE job_runs SET result = $1 WHERE job = 'weekly-digest' AND period = $2", [JSON.stringify(result), period]);
    return NextResponse.json(result);
  } catch (e) {
    // 失敗したら記録を消して、再実行できるようにする
    await query("DELETE FROM job_runs WHERE job = 'weekly-digest' AND period = $1", [period]);
    await logServerError("cron/weekly-digest", e);
    throw e;
  }
}

async function runDigest() {
  const items = await query<Item>(
    `SELECT 'coupon' AS kind, c.id, b.id AS business_id, b.name AS business_name, b.category,
            o.id AS owner_id, o.email AS owner_email, o.name AS owner_name,
            c.title || '（' || c.discount_rate || '% OFF）' AS title,
            to_char(c.expires_at AT TIME ZONE 'Asia/Tokyo', 'MM/DD') || ' まで' AS detail
       FROM coupons c JOIN businesses b ON b.id = c.business_id JOIN business_owners o ON o.id = b.owner_id
      WHERE c.is_active AND c.expires_at > now() AND c.created_at > now() - interval '7 days'
     UNION ALL
     SELECT 'ad', a.id, b.id, b.name, b.category, o.id, o.email, o.name, a.headline, a.body
       FROM ads a JOIN businesses b ON b.id = a.business_id JOIN business_owners o ON o.id = b.owner_id
      WHERE a.is_active AND b.is_premium AND a.ends_at > now() AND a.created_at > now() - interval '7 days'`,
  );
  if (items.length === 0) return { customers: 0, emails: 0, items: 0, reason: "今週の新着なし" };

  const customers = await query<Customer>(
    `SELECT c.id, c.name, c.email, c.unsubscribe_token, c.interests,
            ARRAY(SELECT DISTINCT h.business_id FROM usage_history h WHERE h.customer_id = c.id
                  UNION SELECT r.business_id FROM referrals r WHERE r.customer_id = c.id) AS related
       FROM customers c WHERE c.notify_enabled`,
  );

  const messages: MailMessage[] = [];
  const notificationRows: [number, string, string][] = [];
  const reachByOwner = new Map<number, { email: string; name: string; titles: Set<string>; people: number }>();

  for (const c of customers) {
    const isRelevant = (i: Item) => c.interests.includes(i.category) || c.related.includes(i.business_id);
    const relevant = items.filter(isRelevant).slice(0, 30);
    const others = items.filter((i) => !isRelevant(i)).slice(0, 30 - relevant.length);
    if (relevant.length + others.length === 0) continue;

    for (const i of [...relevant, ...others]) {
      const r = reachByOwner.get(i.owner_id) ?? { email: i.owner_email, name: i.owner_name, titles: new Set(), people: 0 };
      r.titles.add(i.title);
      r.people++;
      reachByOwner.set(i.owner_id, r);
    }

    const title = `今週の新着 ${relevant.length + others.length} 件${relevant.length ? `（あなたへのおすすめ ${relevant.length} 件）` : ""}`;
    notificationRows.push([
      c.id,
      title,
      [...relevant, ...others].map((i) => `${i.kind === "coupon" ? "🎟️" : "📣"} ${i.business_name}：${i.title}`).join("\n"),
    ]);
    messages.push({ to: c.email, subject: `【SagaMap】${title}`, html: customerMail(c, relevant, others) });
  }

  if (notificationRows.length) {
    await query(
      `INSERT INTO notifications (customer_id, title, body, link, kind)
       SELECT unnest($1::int[]), unnest($2::text[]), unnest($3::text[]), '/dashboard/customer', 'weekly'`,
      [notificationRows.map((r) => r[0]), notificationRows.map((r) => r[1]), notificationRows.map((r) => r[2])],
    );
  }

  // 事業者への報告
  for (const r of reachByOwner.values()) {
    messages.push({
      to: r.email,
      subject: `【SagaMap】今週のお知らせが ${r.people} 人のお客さまに届きました`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
        <p style="font-size:20px;font-weight:bold">🎈 SagaMap</p>
        <p>${escapeHtml(r.name)} 様</p>
        <p>今週の新着まとめメールで、次のお知らせを <b>${r.people} 人</b>のお客さまにお届けしました。</p>
        <ul>${[...r.titles].map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        <p><a href="${APP_URL}/dashboard/business">ダッシュボードで閲覧数を見る</a></p>${mailFooter()}</div>`,
    });
  }

  const { sent } = mailEnabled() ? await sendMailBatch(messages) : { sent: 0 };
  return { items: items.length, customers: notificationRows.length, owners: reachByOwner.size, emails: sent, mailEnabled: mailEnabled() };
}

function customerMail(c: Customer, relevant: Item[], others: Item[]) {
  const li = (i: Item) =>
    `<li style="margin:6px 0"><a href="${APP_URL}${i.kind === "coupon" ? `/dashboard/customer/coupons/${i.id}` : `/dashboard/customer?shop=${i.business_id}`}">
      ${i.kind === "coupon" ? "🎟️" : "📣"} <b>${escapeHtml(i.business_name)}</b>：${escapeHtml(i.title)}</a>
      ${i.detail ? `<br><span style="color:#666;font-size:13px">${escapeHtml(i.detail)}</span>` : ""}</li>`;
  return `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
    <p style="font-size:20px;font-weight:bold">🎈 SagaMap 今週の新着</p>
    <p>${escapeHtml(c.name)} さん、今週も佐賀のお店から新しいお知らせが届いています。</p>
    ${relevant.length ? `<h3>✨ あなたへのおすすめ</h3><ul style="padding-left:18px">${relevant.map(li).join("")}</ul>` : ""}
    ${others.length ? `<h3>📍 そのほかの新着</h3><ul style="padding-left:18px">${others.map(li).join("")}</ul>` : ""}
    <p><a href="${APP_URL}/dashboard/customer" style="background:#ff6b4a;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">地図で近くのお店を見る</a></p>
    ${mailFooter(`${APP_URL}/unsubscribe?token=${c.unsubscribe_token}`)}</div>`;
}
