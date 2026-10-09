import { query, queryOne } from "./db";

/** 1 人のお客さまが受け取る自動お知らせは 24 時間に 3 件まで（送りすぎ防止） */
const DAILY_LIMIT = 3;


type Announcement = {
  businessId: number;
  kind: "coupon" | "ad";
  title: string;
  body: string;
  link: string;
};

/**
 * 事業者がクーポン・広告を出したときの自動お知らせ（アプリ内）。
 * 対象: すべてのお客さま（1 人あたり 24 時間に 3 件まで）。
 * アプリ内のお知らせはすぐに届け、メールは週 1 回のまとめで送る。
 */
export async function announceToCustomers(a: Announcement) {
  const biz = await queryOne<{ name: string }>(
    `SELECT b.name FROM businesses b WHERE b.id = $1`,
    [a.businessId],
  );
  if (!biz) return { notified: 0 };

  const recipients = await query<{ id: number }>(
    `SELECT c.id
       FROM customers c
      WHERE (SELECT count(*) FROM notifications n
              WHERE n.customer_id = c.id AND n.kind IN ('coupon', 'ad') AND n.created_at > now() - interval '24 hours') < $1
      ORDER BY c.id`,
    [DAILY_LIMIT],
  );
  if (recipients.length === 0) return { notified: 0 };

  const title = `【${biz.name}】${a.title}`;
  await query(
    `INSERT INTO notifications (customer_id, title, body, link, kind)
     SELECT unnest($1::int[]), $2, $3, $4, $5`,
    [recipients.map((r) => r.id), title, a.body, a.link, a.kind],
  );

  // メールは毎週金曜の「週 1 回のまとめ」で送る（/api/cron/weekly-digest）
  return { notified: recipients.length };
}
