"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** 見出しの上の小さな印（佐賀の 5 つのエリアの色を並べた、佐賀観光マップ独自のしるし） */
export function AreaMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex gap-[3px] ${className}`} aria-hidden>
      {["#3C93B8", "#2F4E86", "#8A5FA6", "#4F9446", "#D0682F"].map((c) => (
        <span key={c} className="h-[3px] w-3 rounded-full" style={{ background: c }} />
      ))}
    </span>
  );
}

/**
 * 横にスライドして見る一覧（スマホは指で、パソコンは左右のボタンで動かす）。
 * 見出しは日本語の題（明朝・字間広め）。band で水色の帯にして、欄ごとに区切る。
 */
export default function Carousel({
  title,
  note,
  children,
  count,
  band = false,
}: {
  title: string;
  /** 以前の英字の小見出し（今は表示しない。見出しはすべて日本語。オーナー決定） */
  eyebrow?: string;
  /** 以前の見出しアイコン（今は表示しない。すっきり見せるため） */
  icon?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
  count?: number;
  band?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className={`py-7 ${band ? "bg-mizu-50" : ""}`}>
      <div className="mb-4 flex items-end justify-between gap-3 px-5">
        <div className="min-w-0">
          <AreaMark className="mb-2" />
          <h2 className="flex items-baseline gap-2 font-mincho text-[22px] font-bold leading-snug tracking-[0.08em] text-slate-900">
            {title}
            {count != null && <span className="num text-xs font-semibold tracking-normal text-slate-400">{count}</span>}
          </h2>
          {note && <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>}
        </div>
        <div className="hidden shrink-0 gap-1.5 sm:flex">
          <button onClick={() => move(-1)} aria-label="前へ" className="grid h-8 w-8 place-items-center rounded-full bg-saga-700 text-white hover:bg-saga-600">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => move(1)} aria-label="次へ" className="grid h-8 w-8 place-items-center rounded-full bg-saga-700 text-white hover:bg-saga-600">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-1 [scroll-padding-left:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
