"use client";

import { useState } from "react";

/**
 * 時間帯別の観光客の多さ（単一系列の棒グラフ）。
 * ピーク時間帯は濃い色で強調。ホバー / タップで値を表示し、表でも確認できる。
 */
export default function HourlyChart({
  values,
  peakHours,
  title,
  selectedHour,
  onSelectHour,
}: {
  values: number[];
  peakHours: number[];
  title: string;
  selectedHour?: number;
  onSelectHour?: (h: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const shown = hover ?? selectedHour ?? null;

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <button className="text-xs text-slate-500 underline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "グラフで見る" : "表で見る"}
        </button>
      </figcaption>
      {showTable ? (
        <table className="mt-2 w-full text-xs text-slate-700">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-normal">時間帯</th>
              <th className="py-1 text-right font-normal">観光客の多さ（最大 100）</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v, h) => (
              <tr key={h} className="border-t border-slate-100">
                <td className="py-0.5">
                  {h}:00{peakHours.includes(h) && "（ピーク）"}
                </td>
                <td className="py-0.5 text-right tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="mt-1 h-5 text-xs text-slate-600">
            {shown != null && (
              <>
                <span className="font-semibold text-slate-900">{shown}:00</span>　観光客の多さ {values[shown]}
                {peakHours.includes(shown) && "（ピーク）"}
              </>
            )}
          </div>
          <div className="relative mt-1 flex h-28 items-end gap-[2px] border-b border-slate-300" onMouseLeave={() => setHover(null)}>
            {values.map((v, h) => {
              const peak = peakHours.includes(h);
              const active = h === shown;
              return (
                <button
                  key={h}
                  type="button"
                  aria-label={`${h}時 ${v}`}
                  onMouseEnter={() => setHover(h)}
                  onFocus={() => setHover(h)}
                  onClick={() => onSelectHour?.(h)}
                  className="group flex h-full flex-1 items-end"
                >
                  <span
                    className={`block w-full rounded-t-[4px] ${peak ? "bg-saga-700" : "bg-saga-300"} ${
                      active ? "ring-2 ring-slate-900 ring-offset-1" : ""
                    }`}
                    style={{ height: `${Math.max(2, v)}%` }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500 tabular-nums">
            <span>0時</span>
            <span>6時</span>
            <span>12時</span>
            <span>18時</span>
            <span>23時</span>
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-saga-700" />
              ピーク時間帯
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-saga-300" />
              その他
            </span>
          </div>
        </>
      )}
    </figure>
  );
}
