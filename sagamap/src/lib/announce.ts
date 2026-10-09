import { query, queryOne } from "./db";

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
 * アプリ内のお知らせはすぐに届け、メールは週 1 回のまとめで送る。
 */
export async function announceToCustomers(a: Announcement) {
  const biz = await queryOne<{ name: string; category: string }>(
    `SELECT b.name, b.category FROM businesses b WHERE b.id = $1`,
    [a.businessId],
  );
  if (!biz) return { notified: 0 };

  const recipients = await query<{ id: number }>(
    `SELECT c.id
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
  if (recipients.length === 0) return { notified: 0 };

  const title = `【${biz.name}】${a.title}`;
  await query(
    `INSERT INTO notifications (customer_id, title, body, link, kind)
     SELECT unnest($1::int[]), $2, $3, $4, $5`,
    [recipients.map((r) => r.id), title, a.body, a.link, a.kind],
  );

  // メールは毎週月曜の「週 1 回のまとめ」で送る（/api/cron/weekly-digest）
  return { notified: recipients.length };
}
