/* eslint-disable @next/next/no-img-element */
import CategoryIcon from "./CategoryIcon";

type Props = {
  shop: { id: number; name: string; category: string; has_photo?: boolean; photo_version?: number | null };
  className?: string;
};

/** 店舗写真。未登録なら業種アイコンのイラスト風プレースホルダー */
export default function ShopPhoto({ shop, className = "" }: Props) {
  if (shop.has_photo) {
    return (
      <img
        src={`/api/businesses/${shop.id}/photo?v=${shop.photo_version ?? 0}`}
        alt={`${shop.name}の写真`}
        className={`object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`} aria-hidden>
      <CategoryIcon category={shop.category} className="h-1/3 max-h-12 w-1/3 max-w-12" strokeWidth={1.5} />
    </div>
  );
}
