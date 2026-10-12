/* eslint-disable @next/next/no-img-element */
import CategoryIcon from "./CategoryIcon";

type Props = {
  shop: { id: number; name: string; category: string; has_photo?: boolean; photo_version?: number | null; cover_photo_id?: number | null };
  className?: string;
};

/** 写真がないときの、業種ごとの色（佐賀の色：柿右衛門・嬉野茶・藍・黄金…） */
const ART: Record<string, { bg: string; fg: string }> = {
  飲食: { bg: "from-[#F6D9C9] via-[#F1C3A8] to-[#E7A383]", fg: "text-[#A8452B]" },
  カフェ: { bg: "from-[#EFE2CF] via-[#E2CBAA] to-[#C9A57B]", fg: "text-[#7A5233]" },
  スイーツ: { bg: "from-[#FBE3E3] via-[#F5CBD0] to-[#E9A9B4]", fg: "text-[#A64559]" },
  バー: { bg: "from-[#D9DCEC] via-[#B9BEDB] to-[#8C92BF]", fg: "text-[#2E3567]" },
  雑貨: { bg: "from-[#F4EBD3] via-[#EBD9A8] to-[#DDBF73]", fg: "text-[#8A6418]" },
  "アート・工芸": { bg: "from-[#DCE6F2] via-[#BFD0E6] to-[#93AED3]", fg: "text-[#1E3A6E]" },
  宿泊: { bg: "from-[#E1E7DC] via-[#C8D5BE] to-[#A4B993]", fg: "text-[#3E5622]" },
  "体験・アクティビティ": { bg: "from-[#FBE6CF] via-[#F7CDA0] to-[#EFA968]", fg: "text-[#B54520]" },
  "美容・健康": { bg: "from-[#EADFF0] via-[#D9C6E6] to-[#BFA3D6]", fg: "text-[#5D3B7E]" },
};

/** 店舗写真。未登録なら業種ごとの色とアイコンのイラスト風 */
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
  // メイン写真がなければ、お店の写真（外観・店内など）の 1 枚目
  if (shop.cover_photo_id) {
    return <img src={`/api/photos/${shop.cover_photo_id}/image`} alt={`${shop.name}の写真`} className={`object-cover ${className}`} loading="lazy" />;
  }
  const art = ART[shop.category] ?? { bg: "from-[#F3EDE3] to-[#E9DCC6]", fg: "text-[#9C8665]" };
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${art.bg} ${art.fg} ${className}`} aria-hidden>
      <span className="absolute -right-4 -top-6 h-20 w-20 rounded-full bg-white/25" />
      <span className="absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-white/20" />
      <CategoryIcon category={shop.category} className="relative h-1/3 max-h-12 w-1/3 max-w-12 opacity-80" strokeWidth={1.6} />
    </div>
  );
}
