import {
  BedDouble,
  Bike,
  CakeSlice,
  Coffee,
  Gift,
  MapPin,
  Palette,
  Sparkles,
  Utensils,
  Wine,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/** 業種ごとのアイコン（地図のピン・カード・絞り込みボタンで共通） */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  飲食: Utensils,
  カフェ: Coffee,
  スイーツ: CakeSlice,
  バー: Wine,
  雑貨: Gift,
  "アート・工芸": Palette,
  宿泊: BedDouble,
  "体験・アクティビティ": Bike,
  "美容・健康": Sparkles,
  その他: MapPin,
};

export const categoryIcon = (category: string) => CATEGORY_ICONS[category] ?? MapPin;

export default function CategoryIcon({ category, ...props }: { category: string } & LucideProps) {
  const Icon = categoryIcon(category);
  return <Icon aria-hidden strokeWidth={2} {...props} />;
}
