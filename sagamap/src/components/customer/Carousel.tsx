"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionTitle from "@/components/ui/SectionTitle";

/** 横にスライドして見る一覧（スマホは指で、パソコンは左右のボタンで動かす） */
export default function Carousel({
  title,
  eyebrow,
  icon,
  note,
  children,
  count,
}: {
  title: string;
  /** 見出しの上の小さな英字（例 COUPON） */
  eyebrow?: string;
  icon?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
  count?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="py-3">
      <div className="mb-2 flex items-end justify-between gap-2 px-4">
        <SectionTitle title={title} eyebrow={eyebrow} icon={icon} count={count} note={note} className="min-w-0 flex-1" />
        <div className="hidden shrink-0 gap-1 sm:flex">
          <button onClick={() => move(-1)} aria-label="前へ" className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => move(1)} aria-label="次へ" className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scroll-padding-left:1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
