import { query } from "./db";
import { APP_URL } from "./config";
import { checkAd, checkCoupon } from "./content-check";
import { escapeHtml } from "./escape";
import { mailFooter, sendMail } from "./mail";

export type ReviewItem = {
  type: "coupon" | "ad";
  id: number;
  text: string;
  business_name: string;
  owner_email: string;
  review_flags: string[];
  created_at: string;
};

/** 運営者の確認待ち（要注意の表現があり、まだ確認していない掲載中のもの） */
export async function pendingReviews() {
  return query<ReviewItem>(
    `SELECT 'coupon' AS type, c.id, c.title || '（' || c.discount_rate || '% OFF）' || CASE WHEN c.conditions <> '' THEN ' / ' || c.conditions ELSE '' END AS text,
            b.name AS business_name, o.email AS owner_email, c.review_flags, c.created_at
       FROM coupons c JOIN businesses b ON b.id = c.business_id JOIN business_owners o ON o.id = b.owner_id
      WHERE c.is_active AND c.expires_at > now() AND cardinality(c.review_flags) > 0 AND c.reviewed_at IS NULL
     UNION ALL
     SELECT 'ad', a.id, a.headline || CASE WHEN a.body <> '' THEN ' / ' || a.body ELSE '' END,
            b.name, o.email, a.review_flags, a.created_at
       FROM ads a JOIN businesses b ON b.id = a.business_id JOIN business_owners o ON o.id = b.owner_id
      WHERE a.is_active AND a.ends_at > now() AND cardinality(a.review_flags) > 0 AND a.reviewed_at IS NULL
     ORDER BY created_at DESC`,
  );
}

type Row = { id: number; owner_email: string; owner_name: string; business_name: string; reviewed_at: string | null; review_flags: string[] };

/**
 * 掲載中のクーポン・広告をすべて再チェックする（毎日の自動処理）。
 *  - 掲載できない表現 → 自動で停止し、事業者に理由をメールで知らせる
 *  - 要注意の表現 → 運営者の確認待ちにする
 * 新しく停止・確認待ちになったものがあれば、運営者にまとめてメールする。
 */
export async function runContentReview() {
  const coupons = await query<Row & { title: string; conditions: string; discount_rate: number }>(
    `SELECT c.id, c.title, c.conditions, c.discount_rate, c.reviewed_at, c.review_flags, b.name AS business_name, o.email AS owner_email, o.name AS owner_name
       FROM coupons c JOIN businesses b ON b.id = c.business_id JOIN business_owners o ON o.id = b.owner_id
      WHERE c.is_active AND c.expires_at > now()`,
  );
  const ads = await query<Row & { headline: string; body: string }>(
    `SELECT a.id, a.headline, a.body, a.reviewed_at, a.review_flags, b.name AS business_name, o.email AS owner_email, o.name AS owner_name
       FROM ads a JOIN businesses b ON b.id = a.business_id JOIN business_owners o ON o.id = b.owner_id
      WHERE a.is_active AND a.ends_at > now()`,
  );

  const stopped: string[] = [];
  const newlyFlagged: string[] = [];
  const targets = [
    ...coupons.map((c) => ({ table: "coupons", label: `クーポン「${c.title}」`, row: c, result: checkCoupon(c) })),
    ...ads.map((a) => ({ table: "ads", label: `広告「${a.headline}」`, row: a, result: checkAd(a) })),
  ];

  for (const { table, label, row, result } of targets) {
    if (result.blocked.length) {
      await query(`UPDATE ${table} SET is_active = false, review_flags = $2 WHERE id = $1`, [row.id, result.blocked]);
      stopped.push(`${row.business_name}：${label}`);
      await sendMail(
        row.owner_email,
        `【SagaMap】${label}の掲載を停止しました`,
        `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
          <p style="font-size:20px;font-weight:bold">🎈 SagaMap</p>
          <p>${escapeHtml(row.owner_name)} 様</p>
          <p>${escapeHtml(row.business_name)} の${escapeHtml(label)}に、法令（景品表示法・医薬品医療機器等法）上掲載できない表現が含まれていたため、掲載を停止しました。</p>
          <ul>${result.blocked.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
          <p>表現を見直して、もう一度登録してください。</p>
          <p><a href="${APP_URL}/dashboard/business">ダッシュボードを開く</a></p>${mailFooter()}</div>`,
      ).catch(() => undefined);
      continue;
    }
    if (row.reviewed_at) continue;
    const before = [...row.review_flags].sort().join("|");
    const after = [...result.warnings].sort().join("|");
    if (before === after) continue;
    await query(`UPDATE ${table} SET review_flags = $2 WHERE id = $1`, [row.id, result.warnings]);
    if (result.warnings.length) newlyFlagged.push(`${row.business_name}：${label}`);
  }

  // 前日以降に登録され、登録時点で要注意だったもの
  const fresh = await query<{ label: string }>(
    `SELECT b.name || '：クーポン「' || c.title || '」' AS label FROM coupons c JOIN businesses b ON b.id = c.business_id
      WHERE c.created_at > now() - interval '1 day' AND cardinality(c.review_flags) > 0 AND c.reviewed_at IS NULL AND c.is_active
     UNION ALL
     SELECT b.name || '：広告「' || a.headline || '」' FROM ads a JOIN businesses b ON b.id = a.business_id
      WHERE a.created_at > now() - interval '1 day' AND cardinality(a.review_flags) > 0 AND a.reviewed_at IS NULL AND a.is_active`,
  );
  const flagged = [...new Set([...newlyFlagged, ...fresh.map((f) => f.label)])];

  if (stopped.length || flagged.length) {
    const admins = await query<{ email: string }>("SELECT email FROM admins");
    const list = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    for (const a of admins) {
      await sendMail(
        a.email,
        `【SagaMap】掲載チェック：停止 ${stopped.length} 件・要確認 ${flagged.length} 件`,
        `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
          <p style="font-size:20px;font-weight:bold">🛡️ 掲載チェックの結果</p>
          ${stopped.length ? `<h3>自動で停止したもの（事業者に通知済み）</h3>${list(stopped)}` : ""}
          ${flagged.length ? `<h3>確認してほしいもの</h3>${list(flagged)}` : ""}
          <p><a href="${APP_URL}/admin">管理画面の「🛡️ 掲載チェック」で確認する</a></p>${mailFooter()}</div>`,
      ).catch(() => undefined);
    }
  }
  return { checked: targets.length, stopped: stopped.length, flagged: flagged.length };
}
