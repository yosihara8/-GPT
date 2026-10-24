import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, Clock, Lock, MapPin, Navigation, Phone, Wallet } from "lucide-react";
import { queryOne } from "@/lib/db";
import { APP_URL, PRICE_LEVEL_LABELS } from "@/lib/config";
import CategoryIcon from "@/components/CategoryIcon";
import ShopPhoto from "@/components/ShopPhoto";
import AreaTag from "@/components/customer/AreaTag";
import { JoinBand, LockedCoupon, StickyJoin } from "@/components/public/Join";
import { getSessionUser } from "@/lib/session";
import { BEST_LABEL_SQL } from "@/lib/coupon";
import { isWeekly, summarizeWeekly } from "@/lib/schedule";
import { areaOf } from "@/lib/areas";
import { guideOfCategory } from "@/lib/guides";
import { jsonLd } from "@/lib/public-shops";

export const dynamic = "force-dynamic";

type Shop = {
  id: number;
  name: string;
  address: string;
  category: string;
  service_description: string;
  price_level: number;
  weekly_hours: unknown;
  business_hours: string;
  closed_days: string;
  hours_note: string;
  has_photo: boolean;
  photo_version: number | null;
  cover_photo_id: number | null;
  best_label: string | null;
  has_coupon: boolean;
};

async function getShop(id: number) {
  if (!Number.isInteger(id)) return null;
  return queryOne<Shop>(
    `SELECT b.id, b.name, b.address, b.category, b.service_description, b.price_level,
            b.weekly_hours, b.business_hours, b.closed_days, b.hours_note,
            b.photo IS NOT NULL AS has_photo, EXTRACT(EPOCH FROM b.photo_updated_at)::bigint AS photo_version,
            (SELECT p.id FROM business_photos p WHERE p.business_id = b.id ORDER BY p.sort, p.id LIMIT 1) AS cover_photo_id,
            ${BEST_LABEL_SQL("b")} AS best_label,
            EXISTS (SELECT 1 FROM coupons c WHERE c.business_id = b.id AND c.is_active AND c.expires_at > now() AND c.deleted_at IS NULL) AS has_coupon
       FROM businesses b WHERE b.id = $1`,
    [id],
  );
}

const hoursOf = (s: Shop) => {
  if (isWeekly(s.weekly_hours)) return summarizeWeekly(s.weekly_hours);
  return { hours: s.business_hours, closed: s.closed_days };
};

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const shop = await getShop(Number(id));
  if (!shop) return { title: "お店が見つかりません" };
  const town = areaOf(shop.address)?.town ?? "佐賀";
  const desc = shop.service_description ? `${shop.service_description.slice(0, 80)}｜` : "";
  return {
    title: `${shop.name}（${town}・${shop.category}）`,
    description: `${desc}${town}の${shop.category}「${shop.name}」の営業時間・場所。会員限定のクーポンも。佐賀観光マップ`,
    openGraph: { title: `${shop.name}｜佐賀観光マップ`, images: shop.has_photo ? [`/api/businesses/${shop.id}/photo?v=${shop.photo_version ?? 0}`] : undefined },
  };
}

/**
 * お店のページ（会員でなくても見られる最低限の情報。検索エンジン用）。
 * 写真・紹介文・エリア・営業時間・住所まで。クーポン・電話・地図での行き方・メニューなどは会員だけ（登録へ案内する）。
 * お客さまがログインしていれば、いつもの地図の画面のお店のページを開く。
 */
export default async function ShopPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const shop = await getShop(Number(id));
  if (!shop) notFound();
  const user = await getSessionUser();
  if (user?.role === "customer") redirect(`/?shop=${shop.id}`);
  const member = Boolean(user);
  const next = `/?shop=${shop.id}`;
  const area = areaOf(shop.address);
  const guide = guideOfCategory(shop.category);
  const { hours, closed } = hoursOf(shop);

  const ld = {
    "@context": "https://schema.org",
    "@type": shop.category === "宿泊" ? "LodgingBusiness" : ["飲食", "カフェ", "スイーツ", "バー"].includes(shop.category) ? "FoodEstablishment" : "LocalBusiness",
    name: shop.name,
    url: `${APP_URL}/shops/${shop.id}`,
    description: shop.service_description || undefined,
    image: shop.has_photo ? `${APP_URL}/api/businesses/${shop.id}/photo?v=${shop.photo_version ?? 0}` : undefined,
    address: { "@type": "PostalAddress", streetAddress: shop.address, addressRegion: "佐賀県", addressCountry: "JP" },
  };

  return (
    <main className={member ? "pb-10" : "pb-24"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <nav aria-label="パンくず" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link href="/guide" className="hover:text-saga-600">お店さがし</Link>
          {guide && (
            <>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <Link href={`/guide/${guide.slug}`} className="hover:text-saga-600">{guide.title}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="truncate text-slate-700">{shop.name}</span>
        </nav>

        <div className="mt-4 aspect-[16/10] overflow-hidden rounded-lg bg-mizu-100">
          <ShopPhoto shop={shop} className="h-full w-full" />
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <CategoryIcon category={shop.category} className="h-3.5 w-3.5" />
          {shop.category}
          {PRICE_LEVEL_LABELS[shop.price_level] ? `・${PRICE_LEVEL_LABELS[shop.price_level]}` : ""}
        </p>
        <h1 className="mt-1 font-mincho text-[26px] font-bold leading-snug text-slate-900">{shop.name}</h1>
        <AreaTag address={shop.address} className="mt-2" />
        {shop.service_description && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{shop.service_description}</p>}

        {/* クーポン（会員だけ） */}
        {shop.has_coupon && (
          <div className="mt-5">
            {member ? (
              <Link href={next} className="btn-accent btn-lg">クーポンを見る</Link>
            ) : (
              <LockedCoupon label={shop.best_label} next={next} />
            )}
          </div>
        )}

        <section className="mt-6 border-t border-slate-200">
          <h2 className="pt-5 text-[15px] font-bold tracking-[0.1em] text-slate-800">基本情報</h2>
          <dl className="mt-2 divide-y divide-slate-100 text-sm">
            <Row icon={MapPin} label="住所">{shop.address}</Row>
            {hours && <Row icon={Clock} label="営業時間">{hours}{shop.hours_note ? `（${shop.hours_note}）` : ""}</Row>}
            {closed && <Row icon={Clock} label="定休日">{closed}</Row>}
            {PRICE_LEVEL_LABELS[shop.price_level] && <Row icon={Wallet} label="価格帯">{PRICE_LEVEL_LABELS[shop.price_level]}（1 人あたり）</Row>}
          </dl>
        </section>

        {/* 会員だけが見られるもの */}
        {!member && (
          <section className="mt-6 rounded-lg bg-mizu-50 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Lock className="h-4 w-4 text-saga-600" aria-hidden />
              会員になると、このお店の
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <li className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2"><Navigation className="h-3.5 w-3.5 text-saga-600" aria-hidden />地図・行き方</li>
              <li className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2"><Phone className="h-3.5 w-3.5 text-saga-600" aria-hidden />電話・予約</li>
              <li className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2"><CategoryIcon category="飲食" className="h-3.5 w-3.5 text-saga-600" />メニュー・写真</li>
              <li className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2"><Lock className="h-3.5 w-3.5 text-saga-600" aria-hidden />お得なクーポン</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">が見られます（無料・1 分で登録）。</p>
          </section>
        )}
        {member && (
          <Link href={next} className="btn-outline mt-6 w-full rounded-full py-3">
            <Navigation className="h-4 w-4" aria-hidden />
            地図でお店のページを開く
          </Link>
        )}

        {/* 同じジャンル・エリアのお店へ */}
        {guide && (
          <div className="mt-8 flex flex-col gap-2 text-sm font-bold">
            <Link href={`/guide/${guide.slug}`} className="flex items-center justify-between rounded-lg px-3 py-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {guide.title}をもっと見る
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
            </Link>
            {area && (
              <Link href={`/guide/${guide.slug}/${{ nw: "hokuseibu", w: "seibu", c: "chubu", e: "tobu", s: "nanbu" }[area.area.key]}`} className="flex items-center justify-between rounded-lg px-3 py-3 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                {area.area.name}エリアの{guide.title.replace(/^佐賀の/, "")}
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </div>

      {!member && (
        <>
          <div className="mt-10">
            <JoinBand next={next} title={`会員になると「${shop.name}」のクーポン・行き方が使えます`} />
          </div>
          <StickyJoin next={next} text={shop.has_coupon ? `「${shop.name}」の会員限定クーポンを使う` : "無料の会員登録で、地図・行き方・クーポンが使えます"} />
        </>
      )}
    </main>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <dt className="flex w-20 shrink-0 items-center gap-1 text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
