/* eslint-disable @next/next/no-img-element */
import { categoryEmoji } from "@/lib/config";

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
    <div className={`flex items-center justify-center bg-gradient-to-br from-sun-100 via-coral-50 to-saga-50 ${className}`} aria-hidden>
      <span className="text-5xl">{categoryEmoji(shop.category)}</span>
    </div>
  );
}
