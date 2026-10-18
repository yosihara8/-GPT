"use client";

import { Search, UtensilsCrossed, X } from "lucide-react";
import type { Specialty } from "@/lib/specialties";

/** 佐賀の名物の説明（下から開く小さな画面）。掲載店があれば、そのお店をさがせる */
export default function SpecialtySheet({ item, shopCount, onSearch, onClose }: { item: Specialty; shopCount: number; onSearch: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-sun-500">{item.area}</p>
            <h2 className="mt-0.5 font-mincho text-[22px] font-bold text-slate-900">{item.name}</h2>
          </div>
          <button onClick={onClose} aria-label="閉じる" className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-sun-100 via-white to-mizu-100 text-sun-500">
          <UtensilsCrossed className="h-10 w-10" strokeWidth={1.3} aria-hidden />
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700">{item.detail}</p>
        {shopCount > 0 ? (
          <button onClick={onSearch} className="btn-accent mt-5 w-full rounded-full py-3">
            <Search className="h-4 w-4" aria-hidden />
            「{item.keyword}」のお店をさがす（{shopCount} 件）
          </button>
        ) : (
          <p className="mt-5 rounded-lg bg-mizu-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
            佐賀観光マップには、まだこの名物のお店が載っていません。お店が登録されると、ここからさがせるようになります。
          </p>
        )}
      </div>
    </div>
  );
}
