import { query } from "./db";

export const ADMIN_LIST_TYPES = ["owners", "stores", "customers", "logs", "errors"] as const;
export type AdminListType = (typeof ADMIN_LIST_TYPES)[number];

/** LIKE 検索用に % と _ をエスケープ */
function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const SQL: Record<AdminListType, string> = {
  owners: `SELECT o.id, o.name, o.email,
                  CASE WHEN o.complimentary THEN 'special' ELSE o.plan END AS plan, o.monthly_price, o.created_at,
                  count(DISTINCT b.id)::int AS store_count, count(DISTINCT r.id)::int AS referral_count
             FROM business_owners o
             LEFT JOIN businesses b ON b.owner_id = o.id
             LEFT JOIN referrals r ON r.business_id = b.id
            WHERE $1 = '' OR o.name ILIKE $2 OR o.email ILIKE $2
            GROUP BY o.id ORDER BY o.created_at DESC LIMIT $3`,
  stores: `SELECT b.id, b.name, b.category, b.address, b.contact, b.is_premium, b.view_count, b.created_at,
                  o.email AS owner_email,
                  (SELECT count(*) FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now())::int AS active_coupons
             FROM businesses b JOIN business_owners o ON o.id = b.owner_id
            WHERE $1 = '' OR b.name ILIKE $2 OR b.address ILIKE $2 OR b.category ILIKE $2 OR o.email ILIKE $2
            ORDER BY b.created_at DESC LIMIT $3`,
  customers: `SELECT c.id, c.name, c.email, array_to_string(c.interests, '・') AS interests, c.notify_enabled, c.created_at,
                     b.name AS referred_by
                FROM customers c
                LEFT JOIN referrals r ON r.customer_id = c.id
                LEFT JOIN businesses b ON b.id = r.business_id
               WHERE $1 = '' OR c.name ILIKE $2 OR c.email ILIKE $2
               ORDER BY c.created_at DESC LIMIT $3`,
  logs: `SELECT l.id, l.created_at, a.email AS admin_email, l.action, l.target, l.detail
           FROM admin_audit_logs l LEFT JOIN admins a ON a.id = l.admin_id
          WHERE $1 = '' OR l.action ILIKE $2 OR l.target ILIKE $2 OR l.detail ILIKE $2
          ORDER BY l.created_at DESC LIMIT $3`,
  errors: `SELECT id, created_at, source, message, url, user_agent
             FROM error_logs
            WHERE $1 = '' OR message ILIKE $2 OR url ILIKE $2
            ORDER BY created_at DESC LIMIT $3`,
};

export function adminList(type: AdminListType, q: string, limit = 500) {
  const term = q.trim().slice(0, 100);
  return query(SQL[type], [term, likePattern(term), limit]);
}

export const CSV_COLUMNS: Record<AdminListType, [key: string, label: string][]> = {
  owners: [["id", "ID"], ["name", "名前"], ["email", "メールアドレス"], ["plan", "プラン"], ["monthly_price", "月額"], ["store_count", "店舗数"], ["referral_count", "紹介人数"], ["created_at", "登録日時"]],
  stores: [["id", "ID"], ["name", "店舗名"], ["category", "業種"], ["address", "住所"], ["contact", "連絡先"], ["owner_email", "事業者メール"], ["is_premium", "有料"], ["active_coupons", "配信中クーポン"], ["view_count", "閲覧数"], ["created_at", "登録日時"]],
  customers: [["id", "ID"], ["name", "名前"], ["email", "メールアドレス"], ["interests", "興味のある業種"], ["notify_enabled", "メール通知"], ["referred_by", "紹介元"], ["created_at", "登録日時"]],
  logs: [["id", "ID"], ["created_at", "日時"], ["admin_email", "運営者"], ["action", "操作"], ["target", "対象"], ["detail", "詳細"]],
  errors: [["id", "ID"], ["created_at", "日時"], ["source", "発生場所"], ["message", "内容"], ["url", "URL"], ["user_agent", "ブラウザ"]],
};

/** CSV の 1 セル。表計算ソフトで数式として実行されないよう先頭の = + - @ を無効化する */
export function csvCell(value: unknown) {
  let s = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
