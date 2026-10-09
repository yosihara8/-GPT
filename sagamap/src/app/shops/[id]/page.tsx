import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { PRICE_LEVEL_LABELS, categoryEmoji } from "@/lib/config";
import { getSessionUser } from "@/lib/session";
import ShopPhoto from "@/components/ShopPhoto";

export const dynamic = "force-dynamic";

type Shop = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  service_description: string;
  contact: string;
  price_level: number;
  instagram_url: string | null;
  twitter_url: string | null;
  has_photo: boolean;
  photo_version: number | null;
  has_coupon: boolean;
};

async function getShop(id: number) {
  if (!Number.isInteger(id)) return null;
  return queryOne<Shop>(
    `SELECT b.id, b.name, b.address, b.lat, b.lng, b.category, b.service_description, b.contact, b.price_level,
            b.instagram_url, b.twitter_url, b.photo IS NOT NULL AS has_photo,
            EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version,
            EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now()) AS has_coupon
       FROM businesses b WHERE b.id = $1`,
    [id],
  );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shop = await getShop(Number(params.id));
  return shop ? { title: shop.name, description: shop.service_description } : { title: "店舗が見つかりません" };
}

/** 店舗情報ページ（会員登録なしで見られる） */
export default async function ShopPage({ params }: { params: { id: string } }) {
  const shop = await getShop(Number(params.id));
  if (!shop) notFound();
  const user = await getSessionUser();
  const isCustomer = user?.role === "customer";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/" className="text-sm font-bold text-saga-600">
        ← 地図に戻る
      </Link>
      <article className="card mt-3 overflow-hidden p-0">
        <ShopPhoto shop={shop} className="h-56 w-full" />
        <div className="space-y-3 p-5">
          <p className="text-sm font-bold text-saga-600">
            {categoryEmoji(shop.category)} {shop.category}　{PRICE_LEVEL_LABELS[shop.price_level]}
          </p>
          <h1 className="text-2xl font-extrabold">{shop.name}</h1>
          {shop.service_description && <p className="leading-7 text-slate-700">{shop.service_description}</p>}

          <dl className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 font-bold text-slate-500">住所</dt>
              <dd>{shop.address}</dd>
            </div>
            {shop.contact && (
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 font-bold text-slate-500">連絡先</dt>
                <dd>{shop.contact}</dd>
              </div>
            )}
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 font-bold text-slate-500">価格帯</dt>
              <dd>{PRICE_LEVEL_LABELS[shop.price_level]}（1 人あたり）</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-3 text-sm font-bold">
            <a href={mapUrl} target="_blank" rel="noreferrer" className="text-saga-600 underline">
              📍 地図アプリで場所を見る
            </a>
            {shop.instagram_url && (
              <a href={shop.instagram_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                Instagram
              </a>
            )}
            {shop.twitter_url && (
              <a href={shop.twitter_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                X（Twitter）
              </a>
            )}
          </div>

          {isCustomer ? (
            <Link href={`/dashboard/customer?shop=${shop.id}`} className="btn-primary w-full">
              {shop.has_coupon ? "🎟️ クーポン・道順を見る" : "🗺️ 道順を見る"}
            </Link>
          ) : (
            <div className="rounded-2xl bg-coral-50 p-4">
              <p className="font-extrabold text-coupon">
                {shop.has_coupon ? "🎟️ このお店はクーポンを配信中です" : "🎈 会員登録でもっと便利に"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                無料の会員登録で、クーポンの利用・お気に入り・道順の案内が使えます。
              </p>
              <Link href={`/register/customer`} className="btn-primary mt-3 w-full">
                無料で会員登録
              </Link>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
