import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { PRICE_LEVEL_LABELS } from "@/lib/config";
import CategoryIcon from "@/components/CategoryIcon";
import { ArrowLeft, ExternalLink, Navigation, Ticket } from "lucide-react";
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
  threads_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  has_photo: boolean;
  photo_version: number | null;
  has_coupon: boolean;
};

async function getShop(id: number) {
  if (!Number.isInteger(id)) return null;
  return queryOne<Shop>(
    `SELECT b.id, b.name, b.address, b.lat, b.lng, b.category, b.service_description, b.contact, b.price_level,
            b.instagram_url, b.twitter_url, b.threads_url, b.facebook_url, b.youtube_url, b.tiktok_url, b.photo IS NOT NULL AS has_photo,
            EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version,
            EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now()) AS has_coupon
       FROM businesses b WHERE b.id = $1`,
    [id],
  );
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const shop = await getShop(Number(params.id));
  return shop ? { title: shop.name, description: shop.service_description } : { title: "店舗が見つかりません" };
}

/** 店舗情報ページ（会員登録なしで見られる） */
export default async function ShopPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const shop = await getShop(Number(params.id));
  if (!shop) notFound();
  const user = await getSessionUser();
  // お客さまは、いつもの「お店のページ」（地図の画面）で開く。どこから来ても同じ画面にする
  if (user?.role === "customer") redirect(`/?shop=${shop.id}`);
  const isCustomer = false;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        地図に戻る
      </Link>
      <article className="card mt-3 overflow-hidden p-0">
        <ShopPhoto shop={shop} className="h-56 w-full" />
        <div className="space-y-3 p-5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <CategoryIcon category={shop.category} className="h-4 w-4" />
            {shop.category}　{PRICE_LEVEL_LABELS[shop.price_level]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
          {shop.service_description && <p className="leading-7 text-slate-700">{shop.service_description}</p>}

          <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
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

          <div className="flex flex-wrap gap-3 text-sm font-medium">
            <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-saga-600 underline">
              地図アプリで場所を見る
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
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
            {shop.threads_url && (
              <a href={shop.threads_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                Threads
              </a>
            )}
            {shop.facebook_url && (
              <a href={shop.facebook_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                Facebook
              </a>
            )}
            {shop.youtube_url && (
              <a href={shop.youtube_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                YouTube
              </a>
            )}
            {shop.tiktok_url && (
              <a href={shop.tiktok_url} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                TikTok
              </a>
            )}
          </div>

          {isCustomer ? (
            <Link href={`/?shop=${shop.id}`} className="btn-primary w-full">
              {shop.has_coupon ? <Ticket className="h-4 w-4" aria-hidden /> : <Navigation className="h-4 w-4" aria-hidden />}
              {shop.has_coupon ? "クーポン・道順を見る" : "道順を見る"}
            </Link>
          ) : null}
        </div>
      </article>
    </main>
  );
}
