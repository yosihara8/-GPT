import { query, queryOne } from "./db";
import { APP_URL, OPERATOR } from "./config";
import { escapeHtml } from "./escape";
import { profileChecklist, profilePercent, type ProfileStore } from "./profile";
import { METRIC_LABELS, monthLabel, prevMonth, thisMonth, type Metrics, type OwnerReport } from "./owner-report-shared";

export { prevMonth, thisMonth };

/** 'YYYY-MM' の 1 か月分（日本時間）の数字を店舗ごとに集める */
async function monthMetrics(ownerId: number, month: string) {
  return query<Metrics & { id: number }>(
    `WITH r AS (SELECT ($2 || '-01')::timestamp AT TIME ZONE 'Asia/Tokyo' AS s, (($2 || '-01')::timestamp + interval '1 month') AT TIME ZONE 'Asia/Tokyo' AS e)
     SELECT b.id,
       (SELECT count(*) FROM usage_history h WHERE h.business_id = b.id AND NOT h.coupon_used AND h.viewed_at >= r.s AND h.viewed_at < r.e)::int AS views,
       (SELECT count(DISTINCT h.customer_id) FROM usage_history h WHERE h.business_id = b.id AND h.viewed_at >= r.s AND h.viewed_at < r.e)::int AS viewers,
       (SELECT count(*) FROM usage_history h WHERE h.business_id = b.id AND h.coupon_used AND h.viewed_at >= r.s AND h.viewed_at < r.e)::int AS coupon_uses,
       (SELECT count(*) FROM shop_events x WHERE x.business_id = b.id AND x.kind = 'route' AND x.created_at >= r.s AND x.created_at < r.e)::int AS route,
       (SELECT count(*) FROM shop_events x WHERE x.business_id = b.id AND x.kind = 'call' AND x.created_at >= r.s AND x.created_at < r.e)::int AS call,
       (SELECT count(*) FROM shop_events x WHERE x.business_id = b.id AND x.kind = 'save' AND x.created_at >= r.s AND x.created_at < r.e)::int AS save,
       (SELECT count(*) FROM shop_events x WHERE x.business_id = b.id AND x.kind = 'share' AND x.created_at >= r.s AND x.created_at < r.e)::int AS share,
       (SELECT count(*) FROM shop_events x WHERE x.business_id = b.id AND x.kind = 'coupon_view' AND x.created_at >= r.s AND x.created_at < r.e)::int AS coupon_view,
       (SELECT count(*) FROM shop_events x WHERE x.business_id = b.id AND x.kind = 'qr_scan' AND x.created_at >= r.s AND x.created_at < r.e)::int AS qr_scan,
       (SELECT count(*) FROM favorites f WHERE f.business_id = b.id AND f.created_at >= r.s AND f.created_at < r.e)::int AS favorites,
       (SELECT count(*) FROM ad_events a JOIN ads d ON d.id = a.ad_id WHERE d.business_id = b.id AND a.kind = 'view' AND a.created_at >= r.s AND a.created_at < r.e)::int AS ad_views,
       (SELECT count(*) FROM ad_events a JOIN ads d ON d.id = a.ad_id WHERE d.business_id = b.id AND a.kind = 'click' AND a.created_at >= r.s AND a.created_at < r.e)::int AS ad_clicks
     FROM businesses b, r WHERE b.owner_id = $1 ORDER BY b.id`,
    [ownerId, month],
  );
}

/** 1 人の事業主の月次レポート */
export async function buildOwnerReport(ownerId: number, month: string): Promise<OwnerReport | null> {
  const owner = await queryOne<{ id: number; name: string; email: string; plan: string }>("SELECT id, name, email, plan FROM business_owners WHERE id = $1", [
    ownerId,
  ]);
  if (!owner) return null;
  const premium = owner.plan === "premium";
  const stores = await query<ProfileStore & { id: number; name: string }>(
    `SELECT b.id, b.name, b.service_description, b.contact, b.weekly_hours, b.amenities, b.payment_methods, b.payment_none,
            b.reservation_url, b.line_url, b.instagram_url, b.photo IS NOT NULL AS has_photo,
            (SELECT count(*) FROM business_photos p WHERE p.business_id = b.id)::int AS gallery_count,
            (SELECT count(*) FROM menu_items m WHERE m.business_id = b.id)::int AS menu_count,
            (SELECT count(*) FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now() AND c.deleted_at IS NULL)::int AS active_coupons
       FROM businesses b WHERE b.owner_id = $1 ORDER BY b.id`,
    [ownerId],
  );
  const cur = await monthMetrics(ownerId, month);
  const prev = await monthMetrics(ownerId, prevMonth(month));
  const nextEvent = await queryOne<{ title: string; starts_on: string }>(
    `SELECT title, to_char(starts_on, 'MM/DD') AS starts_on FROM events
      WHERE is_published AND ends_on >= (now() AT TIME ZONE 'Asia/Tokyo')::date AND starts_on <= (now() AT TIME ZONE 'Asia/Tokyo')::date + 45
      ORDER BY starts_on LIMIT 1`,
  );
  return {
    ownerId,
    name: owner.name,
    email: owner.email,
    premium,
    month,
    label: monthLabel(month),
    stores: stores.map((s) => {
      const c = cur.find((x) => x.id === s.id)!;
      const p = prev.find((x) => x.id === s.id)!;
      const items = profileChecklist(s, premium);
      return {
        id: s.id,
        name: s.name,
        cur: c,
        prev: p,
        profile: profilePercent(items),
        todo: items.filter((i) => !i.done).map((i) => i.label).slice(0, 3),
        advice: adviceFor(c, p, s, premium, nextEvent),
      };
    }),
  };
}

/** 数字から「次にやること」を選ぶ（売上につながる順） */
function adviceFor(c: Metrics, p: Metrics, s: ProfileStore, premium: boolean, ev: { title: string; starts_on: string } | null) {
  const out: string[] = [];
  if (ev && premium) out.push(`${ev.title}（${ev.starts_on}〜）の「イベント限定クーポン」を出すと、特集ページにまとめて載ります。`);
  if (!premium) out.push("有料プランにすると、クーポンと広告で「行ってみよう」のきっかけを作れます。お店の写真も 20 枚まで載せられます。");
  else if ((s.active_coupons ?? 0) === 0) out.push("いま配信中のクーポンがありません。来店のいちばんのきっかけになるので、1 つ出しておきましょう。");
  if (c.route > 0 && c.coupon_uses === 0 && premium && (s.active_coupons ?? 0) > 0)
    out.push(`経路を調べた方が ${c.route} 人いました。来店時に使える「初めての方限定」の特典クーポンが効果的です。`);
  if (c.qr_scan === 0) out.push("レジ横に QR ポスターを置くと、来店したお客さまが会員になり、次の来店にもつながります。");
  if ((s.gallery_count ?? 0) < 3) out.push("店内・料理・外観の写真を増やすと、お店のページを見た方が来店を決めやすくなります。");
  if (c.views > p.views && p.views > 0) out.push(`お店のページを見た回数が先月より ${c.views - p.views} 回増えました。この調子です。`);
  return out.slice(0, 3);
}

const diff = (c: number, p: number) => {
  if (c === p) return `<span style="color:#888">±0</span>`;
  const up = c > p;
  return `<span style="color:${up ? "#3E5622" : "#B54520"}">${up ? "▲" : "▼"}${Math.abs(c - p)}</span>`;
};

/** メールの本文（HTML） */
export function reportHtml(r: OwnerReport) {
  const dash = `${APP_URL}/dashboard/business`;
  const stores = r.stores
    .map(
      (s) => `
      <h2 style="font-size:17px;margin:24px 0 8px">${escapeHtml(s.name)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#F3EDE3"><th style="text-align:left;padding:6px">お客さまの行動</th><th style="text-align:right;padding:6px">${escapeHtml(r.label)}</th><th style="text-align:right;padding:6px">先月比</th></tr>
        ${METRIC_LABELS.filter(([k]) => k !== "ad_clicks" || s.cur.ad_views > 0 || s.prev.ad_views > 0)
          .map(
            ([k, label]) =>
              `<tr><td style="padding:6px;border-bottom:1px solid #eee">${label}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${s.cur[k]}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${diff(s.cur[k], s.prev[k])}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="font-size:14px;margin:12px 0 4px"><b>お店のページの充実度：${s.profile}%</b>${s.todo.length ? `（足りないもの：${s.todo.map(escapeHtml).join("・")}）` : ""}</p>
      ${s.advice.length ? `<div style="background:#FDF0EA;border-radius:10px;padding:10px 14px;font-size:14px"><b>次にやること</b><ul style="margin:6px 0 0;padding-left:18px">${s.advice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></div>` : ""}`,
    )
    .join("");
  return `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:16px;color:#1B1F2A">
    <p style="font-size:12px;color:#1E3A6E;font-weight:bold;letter-spacing:.2em">MONTHLY REPORT</p>
    <p style="font-size:20px;font-weight:bold;margin:4px 0">${escapeHtml(OPERATOR.serviceName)} ${escapeHtml(r.label)}のレポート</p>
    <p style="font-size:14px">${escapeHtml(r.name)} 様<br>先月、${escapeHtml(OPERATOR.serviceName)}でお店に来ようとしたお客さまの動きをまとめました。</p>
    ${stores}
    <p style="margin:24px 0"><a href="${dash}" style="background:#EE6A3A;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">ダッシュボードを開く</a></p>
    <p style="font-size:12px;color:#888">数字は、${escapeHtml(OPERATOR.serviceName)}の会員が押したボタンの数です（同じ人の同じ操作は 1 時間に 1 回まで数えます）。<br>
    このレポートメールは <a href="${dash}/report#settings">レポートの画面</a> で止められます。</p>
  </div>`;
}

/** 毎月 1 日：先月のレポートを全事業主に送る */
export async function sendOwnerReports(send: (to: string, subject: string, html: string) => Promise<unknown>, month = prevMonth(thisMonth())) {
  const owners = await query<{ id: number }>(
    "SELECT o.id FROM business_owners o WHERE o.report_enabled AND EXISTS (SELECT 1 FROM businesses b WHERE b.owner_id = o.id) ORDER BY o.id",
  );
  let sent = 0;
  for (const o of owners) {
    const r = await buildOwnerReport(o.id, month);
    if (!r || r.stores.length === 0) continue;
    await send(r.email, `【${OPERATOR.serviceName}】${r.label}のレポート（お店に来ようとしたお客さま）`, reportHtml(r));
    sent++;
  }
  return { month, sent };
}
