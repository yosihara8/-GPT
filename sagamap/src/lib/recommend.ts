import { query, queryOne } from "./db";
import { haversineMeters, estimateWalkMinutes, type LatLng } from "./geo";
import { crowdFactorAt, jstHour } from "./flows";

/**
 * 簡易 AI 推薦エンジン（ハイブリッド型）
 *  - 業種の嗜好: 閲覧(1)・クーポン利用(3)を 14 日半減で重み付け + 登録時の興味業種
 *  - 協調フィルタリング: 「この店を見た人はこんな店も見ています」（アイテム共起）
 *  - 価格帯の近さ / 現在地からの距離 / 時間帯を考慮した混雑度 / クーポン有無
 */
const WEIGHTS = { category: 0.3, cf: 0.25, distance: 0.15, price: 0.1, crowd: 0.1, coupon: 0.1 };
const HALF_LIFE_DAYS = 14;

type Candidate = {
  id: number;
  name: string;
  address: string;
  category: string;
  service_description: string;
  lat: number;
  lng: number;
  price_level: number;
  crowd_level: number;
  best_discount: number | null;
};

export type Recommendation = Candidate & {
  score: number;
  reasons: string[];
  distance_m: number | null;
  walk_minutes: number | null;
};

export async function recommendForCustomer(customerId: number, here: LatLng | null, limit = 10) {
  const customer = await queryOne<{ interests: string[] }>("SELECT interests FROM customers WHERE id = $1", [customerId]);
  const history = await query<{
    business_id: number;
    category: string;
    price_level: number;
    coupon_used: boolean;
    age_days: number;
  }>(
    `SELECT h.business_id, b.category, b.price_level, h.coupon_used,
            EXTRACT(EPOCH FROM (now() - h.viewed_at)) / 86400 AS age_days
       FROM usage_history h JOIN businesses b ON b.id = h.business_id
      WHERE h.customer_id = $1
      ORDER BY h.viewed_at DESC LIMIT 200`,
    [customerId],
  );

  // 1) 業種の嗜好スコア
  const catPref = new Map<string, number>();
  for (const c of customer?.interests ?? []) catPref.set(c, (catPref.get(c) ?? 0) + 2);
  let priceSum = 0;
  let priceWeight = 0;
  for (const h of history) {
    const w = (h.coupon_used ? 3 : 1) * Math.pow(0.5, Number(h.age_days) / HALF_LIFE_DAYS);
    catPref.set(h.category, (catPref.get(h.category) ?? 0) + w);
    priceSum += h.price_level * w;
    priceWeight += w;
  }
  const catMax = Math.max(1e-9, ...catPref.values());
  const avgPrice = priceWeight > 0 ? priceSum / priceWeight : null;

  // 2) 協調フィルタリング（アイテム共起）
  const seen = [...new Set(history.map((h) => h.business_id))];
  const cfRows = seen.length
    ? await query<{ business_id: number; users: string }>(
        `SELECT h2.business_id, count(DISTINCT h2.customer_id) AS users
           FROM usage_history h1
           JOIN usage_history h2 ON h2.customer_id = h1.customer_id AND h2.business_id <> h1.business_id
          WHERE h1.business_id = ANY($1::int[]) AND h1.customer_id <> $2
          GROUP BY h2.business_id`,
        [seen, customerId],
      )
    : [];
  const cf = new Map(cfRows.map((r) => [r.business_id, Number(r.users)]));
  const cfMax = Math.max(1e-9, ...cf.values());

  const recent = new Set(history.filter((h) => Number(h.age_days) < 1).map((h) => h.business_id));

  const candidates = await query<Candidate>(
    `SELECT b.id, b.name, b.address, b.category, b.service_description, b.lat, b.lng, b.price_level, b.crowd_level,
            (SELECT max(discount_rate) FROM coupons c
              WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now()) AS best_discount
       FROM businesses b`,
  );

  const hour = jstHour();
  const results: Recommendation[] = candidates.map((b) => {
    const reasons: string[] = [];
    const sCat = (catPref.get(b.category) ?? 0) / catMax;
    if (sCat > 0.5) reasons.push(`よく見ている「${b.category}」`);

    const sCf = (cf.get(b.id) ?? 0) / cfMax;
    if (sCf > 0.3) reasons.push("似た好みの人が訪れています");

    const sPrice = avgPrice == null ? 0.5 : 1 - Math.abs(b.price_level - avgPrice) / 2;

    let distance: number | null = null;
    let sDist = 0.5;
    if (here) {
      distance = haversineMeters(here, b);
      sDist = Math.exp(-distance / 1500);
      if (distance < 800) reasons.push("徒歩圏内");
    }

    // 混雑度: 店舗の基本混雑度 × 時間帯の人流
    const crowdNow = (b.crowd_level / 5) * (0.5 + crowdFactorAt(b.lat, b.lng, hour));
    const sCrowd = Math.max(0, 1 - crowdNow);
    if (sCrowd > 0.6) reasons.push("今は空いていそう");

    const sCoupon = b.best_discount ? 1 : 0;
    if (b.best_discount) reasons.push(`${b.best_discount}% OFF クーポンあり`);

    let score =
      WEIGHTS.category * sCat +
      WEIGHTS.cf * sCf +
      WEIGHTS.distance * sDist +
      WEIGHTS.price * sPrice +
      WEIGHTS.crowd * sCrowd +
      WEIGHTS.coupon * sCoupon;
    if (recent.has(b.id)) score *= 0.5; // 直近 24 時間に見た店は控えめに

    return {
      ...b,
      score: Math.round(score * 1000) / 1000,
      reasons: reasons.slice(0, 3),
      distance_m: distance == null ? null : Math.round(distance),
      walk_minutes: distance == null ? null : estimateWalkMinutes(distance),
    };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
