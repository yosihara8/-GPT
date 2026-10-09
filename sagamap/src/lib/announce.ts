import { query, queryOne } from "./db";
import { APP_URL } from "./config";
import { escapeHtml } from "./escape";
import { mailEnabled, sendMail, sendMailBatch } from "./mail";
import { logServerError } from "./server-error";

/** 1 人のお客さまが受け取る自動お知らせは 24 時間に 3 件まで（送りすぎ防止） */
const DAILY_LIMIT = 3;
const MAX_RECIPIENTS = 1000;

type Announcement = {
  businessId: number;
  kind: "coupon" | "ad";
  title: string;
  body: string;
  link: string;
};

/**
 * 事業者がクーポン・広告を出したときの自動お知らせ。
 * 対象: お知らせを希望し、かつ「その業種に興味がある」「その店を見た・使った」「その店の紹介で登録した」お客さま。
 * アプリ内のお知らせに加え、メール送信が設定済みならメールも送る。
 */
export async function announceToCustomers(a: Announcement) {
  const biz = await queryOne<{ name: string; category: string; owner_email: string; owner_name: string }>(
    `SELECT b.name, b.category, o.email AS owner_email, o.name AS owner_name
       FROM businesses b JOIN business_owners o ON o.id = b.owner_id WHERE b.id = $1`,
    [a.businessId],
  );
  if (!biz) return { notified: 0, emailed: 0 };

  const recipients = await query<{ id: number; name: string; email: string; unsubscribe_token: string }>(
    `SELECT c.id, c.name, c.email, c.unsubscribe_token
       FROM customers c
      WHERE c.notify_enabled
        AND ($2 = ANY(c.interests)
             OR EXISTS (SELECT 1 FROM usage_history h WHERE h.customer_id = c.id AND h.business_id = $1)
             OR EXISTS (SELECT 1 FROM referrals r WHERE r.customer_id = c.id AND r.business_id = $1))
        AND (SELECT count(*) FROM notifications n
              WHERE n.customer_id = c.id AND n.kind IN ('coupon', 'ad') AND n.created_at > now() - interval '24 hours') < $3
      ORDER BY c.id
      LIMIT $4`,
    [a.businessId, biz.category, DAILY_LIMIT, MAX_RECIPIENTS],
  );
  if (recipients.length === 0) return { notified: 0, emailed: 0 };

  const title = `【${biz.name}】${a.title}`;
  await query(
    `INSERT INTO notifications (customer_id, title, body, link, kind)
     SELECT unnest($1::int[]), $2, $3, $4, $5`,
    [recipients.map((r) => r.id), title, a.body, a.link, a.kind],
  );

  let emailed = 0;
  if (mailEnabled()) {
    try {
      const res = await sendMailBatch(
        recipients.map((r) => ({
          to: r.email,
          subject: `【SagaMap】${title}`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
            <p style="font-size:20px;font-weight:bold">🎈 SagaMap</p>
            <p>${escapeHtml(r.name)} さん、気になるお店から新しいお知らせです。</p>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(a.body)}</p>
            <p><a href="${APP_URL}${a.link}" style="background:#ff6b4a;color:#fff;padding:10px 20px;border-radius:9999px;text-decoration:none">くわしく見る</a></p>
            <p style="color:#888;font-size:12px"><a href="${APP_URL}/unsubscribe?token=${r.unsubscribe_token}">お知らせメールの配信停止</a></p>
          </div>`,
        })),
      );
      emailed = res.sent;
      // 事業者にも配信完了をお知らせ
      await sendMail(
        biz.owner_email,
        `【SagaMap】「${a.title}」を ${recipients.length} 人のお客さまにお知らせしました`,
        `<p>${escapeHtml(biz.owner_name)} 様</p><p>「${escapeHtml(a.title)}」を、興味のありそうなお客さま ${recipients.length} 人にお知らせしました（メール ${emailed} 通）。</p>
         <p><a href="${APP_URL}/dashboard/business">ダッシュボードを見る</a></p>`,
      );
    } catch (e) {
      await logServerError(`announce:${a.kind}`, e);
    }
  }
  return { notified: recipients.length, emailed };
}
