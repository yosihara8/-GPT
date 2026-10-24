import { query } from "./db";
import { BEST_LABEL_SQL } from "./coupon";

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

export async function publicShops(category?: string) {
  return query<PublicShop>(
    `SELECT b.id, b.name, b.address, b.category, b.service_description,
            b.photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version,
            (SELECT p.id FROM business_photos p WHERE p.business_id = b.id ORDER BY p.sort, p.id LIMIT 1) AS cover_photo_id,
            ${BEST_LABEL_SQL("b")} AS best_label,
            EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now() AND c.deleted_at IS NULL) AS has_coupon
       FROM businesses b
      WHERE ($1::text IS NULL OR b.category = $1)
      ORDER BY (b.photo IS NOT NULL) DESC, b.is_premium DESC, b.view_count DESC, b.id`,
    [category ?? null],
  );
}

/** JSON-LD を <script> に埋め込むとき、</script> などで抜け出されないようにする */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
