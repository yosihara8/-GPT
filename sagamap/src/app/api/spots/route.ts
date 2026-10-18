import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 観光スポットと、宿・交通・飲食の基本情報（ルート提案・距離計算・地図の表示用）。
 * お店の人が自分で登録した（電話番号が同じ掲載店がある）ものは、登録したお店のページを優先して出さない。
 */
export async function GET() {
  const spots = await query(
    `SELECT s.id, s.name, s.description, s.lat, s.lng, s.kind, s.area, s.address, s.tel
       FROM tourist_spots s
      WHERE NOT s.hidden
        -- 観光名所は写真も詳しい情報も無いため出さない（オーナー決定）。宿・交通・飲食の基本情報だけ
        AND s.kind <> 'sight'
        AND (s.tel IS NULL OR NOT EXISTS (
              SELECT 1 FROM businesses b
               WHERE regexp_replace(b.contact, '\\D', '', 'g') LIKE '%' || regexp_replace(s.tel, '\\D', '', 'g') || '%'))
      ORDER BY s.id`,
  );
  return NextResponse.json({ spots }, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } });
}
