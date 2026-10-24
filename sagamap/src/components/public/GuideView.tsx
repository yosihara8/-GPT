import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AreaMark } from "@/components/customer/Carousel";
import PublicShopCard from "./PublicShopCard";
import { JoinBand, StickyJoin } from "./Join";
import { AREA_LIST, areaOf } from "@/lib/areas";
import { AREA_LABEL_EN, AREA_SLUGS, GUIDES, GUIDE_EN, type Guide } from "@/lib/guides";
import { getT } from "@/lib/i18n-server";
import { APP_URL } from "@/lib/config";
import { jsonLd, type PublicShop } from "@/lib/public-shops";

/** お店さがしのページ（業種ごと。エリアでしぼり込み可） */
export default async function GuideView({ guide, areaKey, shops, member }: { guide: Guide; areaKey?: string; shops: PublicShop[]; member: boolean }) {
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

        {/* エリアでしぼり込む */}
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

        <h2 className="mt-7 text-[15px] font-bold tracking-[0.1em] text-slate-800">
          {t("掲載店")} <span className="num text-slate-400">{list.length}</span>
        </h2>
        {list.length === 0 ? (
          <p className="mt-3 rounded-lg bg-mizu-50 px-4 py-5 text-sm leading-relaxed text-slate-600">
            {t("このエリアの掲載店は準備中です。ほかのエリアもご覧ください。")}
          </p>
        ) : (
          <div className="mt-1">
            {list.map((s) => (
              <PublicShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}

        {/* ほかのジャンル */}
        <h2 className="mt-8 text-[15px] font-bold tracking-[0.1em] text-slate-800">{t("ほかのジャンルからさがす")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <Link key={g.slug} href={`/guide/${g.slug}${area ? `/${AREA_SLUGS[area.key].slug}` : ""}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {lang === "en" ? gTitle(g).replace(/ in Saga$/, "") : g.title.replace(/^佐賀の/, "")}
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
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
