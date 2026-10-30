import { query } from "./db";
import { BEST_LABEL_SQL } from "./coupon";
import { guideFilter, type Guide } from "./guides";

/** 誰でも見られるページ（お店さがし・お店のページ）に出す、お店の最低限の情報 */
export type PublicShop = {
  id: number;
  name: string;
  address: string;
  category: string;
  service_description: string;
  has_photo: boolean;
  photo_version: number | null;
  cover_photo_id: number | null;
  best_label: string | null;
  has_coupon: boolean;
};

/** お店さがしのページに載せるお店（業種・町・言葉でしぼる。どれも無ければ全部） */
export async function guideShops(g: Guide) {
  const f = guideFilter(g);
  return publicShops({ categories: f.categories, towns: f.towns, words: f.words });
}

export async function publicShops(filter: { categories?: string[] | null; towns?: string[] | null; words?: string[] | null } = {}) {
  return query<PublicShop>(
    `SELECT b.id, b.name, b.address, b.category, b.service_description,
            b.photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version,
            (SELECT p.id FROM business_photos p WHERE p.business_id = b.id ORDER BY p.sort, p.id LIMIT 1) AS cover_photo_id,
            ${BEST_LABEL_SQL("b")} AS best_label,
            EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now() AND c.deleted_at IS NULL) AS has_coupon
       FROM businesses b
      WHERE ($1::text[] IS NULL OR b.category = ANY($1))
        AND ($2::text[] IS NULL OR b.address LIKE ANY (SELECT '%' || t || '%' FROM unnest($2::text[]) t))
        AND ($3::text[] IS NULL OR EXISTS (
              SELECT 1 FROM unnest($3::text[]) w
               WHERE b.name LIKE '%' || w || '%' OR b.service_description LIKE '%' || w || '%'
                  OR EXISTS (SELECT 1 FROM menu_items m WHERE m.business_id = b.id AND (m.name LIKE '%' || w || '%' OR m.description LIKE '%' || w || '%'))))
      ORDER BY (b.photo IS NOT NULL) DESC, b.is_premium DESC, b.view_count DESC, b.id`,
    [filter.categories ?? null, filter.towns ?? null, filter.words ?? null],
  );
}

/** 宿・飲食の基本情報（公開資料の名前・住所。お店が自分で登録したものは除く）。電話は会員だけなので出さない */
export type PublicListing = { id: number; name: string; kind: "stay" | "food"; address: string };

const FOOD_CATEGORIES = ["飲食", "カフェ", "スイーツ", "バー"];

/**
 * 町が決まっている「人気のテーマ」のページ（嬉野温泉・武雄温泉など）に、基本情報も載せる。
 * 宿はページの業種に宿泊が入る（または業種の指定が無い）とき、飲食は飲食の業種が入るときだけ。言葉でしぼるページには載せない。
 */
export async function guideListings(g: Guide): Promise<PublicListing[]> {
  const f = guideFilter(g);
  if (!f.towns || f.words) return [];
  const kinds = [
    ...(!f.categories || f.categories.includes("宿泊") ? ["stay"] : []),
    ...(!f.categories || f.categories.some((c) => FOOD_CATEGORIES.includes(c)) ? ["food"] : []),
  ];
  if (kinds.length === 0) return [];
  return query<PublicListing>(
    `SELECT s.id, s.name, s.kind, s.address
       FROM tourist_spots s
      WHERE NOT s.hidden AND s.kind = ANY($1) AND s.address IS NOT NULL
        AND s.address LIKE ANY (SELECT '%' || t || '%' FROM unnest($2::text[]) t)
        AND (s.tel IS NULL OR NOT EXISTS (
              SELECT 1 FROM businesses b
               WHERE regexp_replace(b.contact, '\\D', '', 'g') LIKE '%' || regexp_replace(s.tel, '\\D', '', 'g') || '%'))
      ORDER BY s.kind DESC, s.id`,
    [kinds, f.towns],
  );
}

/** JSON-LD を <script> に埋め込むとき、</script> などで抜け出されないようにする */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
