import Link from "next/link";
import { Ticket } from "lucide-react";
import ShopPhoto from "@/components/ShopPhoto";
import CategoryIcon from "@/components/CategoryIcon";
import AreaTag from "@/components/customer/AreaTag";
import type { PublicShop } from "@/lib/public-shops";
import { getT } from "@/lib/i18n-server";

/** お店さがしのページの、お店の 1 行（写真・名前・エリア・紹介文・クーポンの有無） */
export default async function PublicShopCard({ shop }: { shop: PublicShop }) {
  const { t } = await getT();
  return (
    <Link href={`/shops/${shop.id}`} className="group flex gap-4 border-b border-slate-100 py-4">
      <span className="relative h-[90px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-mizu-100">
        <ShopPhoto shop={shop} className="h-full w-full transition duration-300 group-hover:scale-[1.03]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug text-slate-900 group-hover:text-saga-600">{shop.name}</span>
        <AreaTag address={shop.address} className="mt-1" />
        <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <CategoryIcon category={shop.category} className="h-3 w-3" />
          {t(shop.category)}
        </span>
        {shop.service_description && <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-600">{shop.service_description}</span>}
        {shop.has_coupon && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-bold text-coupon">
            <Ticket className="h-3 w-3" aria-hidden />
            {t("会員限定クーポンあり")}
          </span>
        )}
      </span>
    </Link>
  );
}
