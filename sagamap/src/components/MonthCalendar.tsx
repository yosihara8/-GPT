"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayHours, jstParts, type SpecialDay, type Weekly } from "@/lib/schedule";

/**
 * 月のカレンダー（営業日・定休日・臨時休業・特別営業）。
 * お客さまのお店のページと、事業主の営業カレンダー設定で共通に使う。
 */
export default function MonthCalendar({
  weekly,
  specials,
  selected,
  onSelect,
  maxMonths = 3,
}: {
  weekly: Weekly | null;
  specials: SpecialDay[];
  selected?: string | null;
  onSelect?: (ymd: string) => void;
  maxMonths?: number;
}) {
  const today = jstParts().ymd;
  const [offset, setOffset] = useState(0);
  const base = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  base.setUTCMonth(base.getUTCMonth() + offset);
  const first = base.toISOString().slice(0, 10);
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (base.getUTCDay() + 6) % 7; // 月曜はじまり

  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
  while (cells.length % 7) cells.push(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="前の月"
          disabled={offset === 0}
          onClick={() => setOffset((o) => o - 1)}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="font-mincho text-base font-bold">
          <span className="num">{y}</span>年<span className="num">{m + 1}</span>月
        </p>
        <button
          type="button"
          aria-label="次の月"
          disabled={offset >= maxMonths - 1}
          onClick={() => setOffset((o) => o + 1)}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500">
        {["月", "火", "水", "木", "金", "土", "日"].map((d, i) => (
          <span key={d} className={i === 5 ? "text-saga-600" : i === 6 ? "text-coral-500" : ""}>
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((ymd, i) => {
          if (!ymd) return <span key={i} />;
          const h = dayHours(ymd, weekly, specials);
          const past = ymd < today;
          const closed = h?.closed;
          const special = h?.special && !h.closed;
          const isSel = selected === ymd;
          const tone = closed
            ? h?.special
              ? "bg-coral-50 text-coral-700 ring-1 ring-coral-100"
              : "bg-slate-100 text-slate-400"
            : special
              ? "bg-sun-100 text-sun-500 ring-1 ring-sun-300"
              : "bg-white text-slate-800 ring-1 ring-slate-200";
          const Tag = onSelect ? "button" : "div";
          return (
            <Tag
              key={ymd}
              type={onSelect ? "button" : undefined}
              onClick={onSelect && !past ? () => onSelect(ymd) : undefined}
              disabled={onSelect ? past : undefined}
              aria-label={`${Number(ymd.slice(5, 7))}月${Number(ymd.slice(8))}日 ${closed ? (h?.special ? "臨時休業" : "定休日") : special ? "特別営業" : "営業"}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${tone} ${past ? "opacity-40" : ""} ${
                isSel ? "outline outline-2 outline-offset-1 outline-saga-600" : ""
              } ${ymd === today ? "font-bold" : ""}`}
            >
              <span className="num leading-none">{Number(ymd.slice(8))}</span>
              <span className="mt-0.5 text-[9px] font-bold leading-none">{closed ? (h?.special ? "臨休" : "休") : special ? "特別" : ""}</span>
              {ymd === today && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-asa-500" />}
            </Tag>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <Legend className="bg-slate-100" label="定休日" />
        <Legend className="bg-coral-50 ring-1 ring-coral-100" label="臨時休業" />
        <Legend className="bg-sun-100 ring-1 ring-sun-300" label="特別営業" />
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-asa-500" />
          今日
        </span>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
