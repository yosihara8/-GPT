"use client";

import { areaOf } from "@/lib/areas";
import { useT } from "@/components/LangProvider";

/** エリアの色札と市町名（例：［中部エリア］【佐賀市】） */
export default function AreaTag({ address, className = "" }: { address?: string | null; className?: string }) {
  const a = areaOf(address);
  const t = useT();
  if (!a) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`rounded-full px-2 py-[1px] text-[10px] font-bold tracking-wide ${a.area.cls}`}>{t(`${a.area.name}エリア`)}</span>
      <span className="text-[11px] text-slate-500">{t(a.town)}</span>
    </span>
  );
}
