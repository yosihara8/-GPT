import Link from "next/link";
import { BedDouble, ChevronRight, MapPin, UtensilsCrossed } from "lucide-react";
import { AreaMark } from "@/components/customer/Carousel";
import PublicShopCard from "./PublicShopCard";
import { JoinBand, StickyJoin } from "./Join";
import { AREA_LIST, areaOf } from "@/lib/areas";
import { AREA_LABEL_EN, AREA_SLUGS, GUIDES, GUIDE_EN, THEMES, isTheme, type Guide } from "@/lib/guides";
import { getT } from "@/lib/i18n-server";
import { APP_URL } from "@/lib/config";
import { jsonLd, type PublicListing, type PublicShop } from "@/lib/public-shops";
import AreaTag from "@/components/customer/AreaTag";

/** お店さがしのページ（業種ごと。エリアでしぼり込み可） */
export default async function GuideView({ guide, areaKey, shops, listings = [], member }: { guide: Guide; areaKey?: string; shops: PublicShop[]; listings?: PublicListing[]; member: boolean }) {
  const { lang, t } = await getT();
  const area = areaKey ? AREA_LIST.find((a) => a.key === areaKey) : undefined;
  const en = lang === "en" ? GUIDE_EN[guide.slug] : undefined;
  const gTitle = (g: Guide) => (lang === "en" ? GUIDE_EN[g.slug]?.title ?? g.title : g.title);
  const list = areaKey ? shops.filter((s) => areaOf(s.address)?.area.key === areaKey) : shops;
  const title = en
    ? area
      ? `${en.title} — ${t(`${area.name}エリア`)} (${AREA_LABEL_EN[area.key]})`
      : en.title
    : area
      ? `佐賀県${area.name}（${AREA_SLUGS[area.key].label}）の${guide.title.replace(/^佐賀の/, "")}`
      : guide.title;
  const path = `/guide/${guide.slug}${area ? `/${AREA_SLUGS[area.key].slug}` : ""}`;
  const theme = isTheme(guide);
  const counts = Object.fromEntries(AREA_LIST.map((a) => [a.key, shops.filter((s) => areaOf(s.address)?.area.key === a.key).length]));

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "佐賀観光マップ", item: `${APP_URL}/guide` },
        { "@type": "ListItem", position: 2, name: guide.title, item: `${APP_URL}/guide/${guide.slug}` },
        ...(area ? [{ "@type": "ListItem", position: 3, name: title, item: `${APP_URL}${path}` }] : []),
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      itemListElement: list.slice(0, 50).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${APP_URL}/shops/${s.id}`, name: s.name })),
    },
  ];

  return (
    <main className={member ? "pb-10" : "pb-24"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <nav aria-label="パンくず" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link href="/guide" className="hover:text-saga-600">{t("お店さがし")}</Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          {area ? (
            <>
              <Link href={`/guide/${guide.slug}`} className="hover:text-saga-600">{gTitle(guide)}</Link>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <span className="text-slate-700">{t(`${area.name}エリア`)}</span>
            </>
          ) : (
            <span className="text-slate-700">{gTitle(guide)}</span>
          )}
        </nav>
        <AreaMark className="mb-2 mt-6" />
        <h1 className="font-mincho text-[26px] font-bold leading-snug tracking-[0.04em] text-slate-900">{title}</h1>
        <p className="mt-1 text-sm font-bold tracking-[0.1em] text-slate-600">{en?.lead ?? guide.lead}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{en?.intro ?? guide.intro}</p>

        {/* エリアでしぼり込む（よく検索される言葉のページは町が決まっているので出さない） */}
        {!theme && (
        <div className="mt-5 flex flex-wrap gap-2" aria-label={t("エリア")}>
          <Link
            href={`/guide/${guide.slug}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${!area ? "bg-saga-700 text-white ring-saga-700" : "bg-white text-slate-700 ring-slate-300"}`}
          >
            {t("全エリア")}（{shops.length}）
          </Link>
          {AREA_LIST.map((a) => (
            <Link
              key={a.key}
              href={`/guide/${guide.slug}/${AREA_SLUGS[a.key].slug}`}
              className="rounded-full px-3 py-1.5 text-xs font-bold ring-1"
              style={area?.key === a.key ? { background: a.border, color: "#fff", boxShadow: `inset 0 0 0 1px ${a.border}` } : { color: a.border, boxShadow: `inset 0 0 0 1px ${a.border}` }}
            >
              {t(a.name)}（{counts[a.key]}）
            </Link>
          ))}
        </div>
        )}

        {(list.length > 0 || listings.length === 0) && (
          <h2 className="mt-7 text-[15px] font-bold tracking-[0.1em] text-slate-800">
            {t("掲載店")} <span className="num text-slate-400">{list.length}</span>
          </h2>
        )}
        {list.length === 0 && listings.length > 0 ? null : list.length === 0 ? (
          <p className="mt-3 rounded-lg bg-mizu-50 px-4 py-5 text-sm leading-relaxed text-slate-600">
            {theme ? t("このページの掲載店は準備中です。ほかのジャンルもご覧ください。") : t("このエリアの掲載店は準備中です。ほかのエリアもご覧ください。")}
          </p>
        ) : (
          <div className="mt-1">
            {list.map((s) => (
              <PublicShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}

        {/* 宿・飲食の基本情報（名前・住所だけ。電話・行き方は会員の地図で） */}
        {listings.length > 0 && (
          <>
            <h2 className="mt-7 text-[15px] font-bold tracking-[0.1em] text-slate-800">
              {t("宿・施設の基本情報")} <span className="num text-slate-400">{listings.length}</span>
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t("電話番号・地図での行き方は、会員登録（無料）をすると地図の画面で見られます。")}</p>
            <ul className="mt-1">
              {listings.map((l) => {
                const Icon = l.kind === "stay" ? BedDouble : UtensilsCrossed;
                return (
                  <li key={l.id} className="flex gap-3 border-b border-slate-100 py-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mizu-50 text-saga-600">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-snug text-slate-900">{l.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <AreaTag address={l.address} />
                        <span className="text-[11px] text-slate-500">{t(l.kind === "stay" ? "宿" : "飲食・おみやげ")}</span>
                      </span>
                      <span className="mt-1 flex items-start gap-1 text-xs text-slate-600">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                        {l.address}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {t("お店・宿の方へ：")}
              <Link href="/register/business" className="font-bold text-saga-600 underline">{t("無料で登録")}</Link>
              {t("すると、写真・紹介文・クーポンを載せられます。")}
            </p>
          </>
        )}

        {/* よく検索されているテーマ */}
        <h2 className="mt-8 text-[15px] font-bold tracking-[0.1em] text-slate-800">{t("人気のテーマからさがす")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {THEMES.filter((g) => g.slug !== guide.slug).map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {gTitle(g)}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          ))}
        </div>

        {/* ほかのジャンル */}
        <h2 className="mt-8 text-[15px] font-bold tracking-[0.1em] text-slate-800">{t("ほかのジャンルからさがす")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}${area ? `/${AREA_SLUGS[area.key].slug}` : ""}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {lang === "en" ? gTitle(g).replace(/ in Saga$/, "") : g.title.replace(/^佐賀の/, "")}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          ))}
        </div>
      </div>

      {!member && (
        <>
          <div className="mt-10">
            <JoinBand title="会員になると、クーポン・地図・行き方がすべて使えます" />
          </div>
          <StickyJoin text="会員限定クーポンを使うには、無料の会員登録が必要です" />
        </>
      )}
    </main>
  );
}
