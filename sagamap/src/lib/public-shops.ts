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

/** JSON-LD を <script> に埋め込むとき、</script> などで抜け出されないようにする */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
