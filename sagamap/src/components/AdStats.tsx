import { Eye, MousePointerClick, Users } from "lucide-react";

export type AdStatsData = { view_count?: number; click_count?: number; viewer_count?: number };

/** 広告の統計（表示回数・タップ数・見たお客さまの人数） */
export default function AdStats({ ad, compact = false }: { ad: AdStatsData; compact?: boolean }) {
  const items = [
    { icon: Eye, label: "表示", value: ad.view_count ?? 0, unit: "回" },
    { icon: MousePointerClick, label: "タップ", value: ad.click_count ?? 0, unit: "回" },
    { icon: Users, label: "見た会員", value: ad.viewer_count ?? 0, unit: "人" },
  ];
  if (compact) {
    return (
      <span className="text-xs text-slate-500">
        {items.map((i) => `${i.label} ${i.value.toLocaleString()}${i.unit}`).join("・")}
      </span>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ icon: Icon, label, value, unit }) => (
        <div key={label} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
          <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </p>
          <p className="text-lg font-bold tabular-nums">
            {value.toLocaleString()}
            <span className="ml-0.5 text-xs font-normal text-slate-500">{unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
