"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

export type SlidePhoto = { id: number; kind: string; caption: string };
type Slide = { src: string; kind: string; caption: string };

/**
 * お店の写真（メイン写真＋外観・店内・商品など）を横にスライドして見る。
 * タップで画面いっぱいに表示。種類のボタンでその写真へ移動する。
 */
export default function PhotoSlider({
  main,
  photos,
  name,
  fallback,
}: {
  main: string | null;
  photos: SlidePhoto[];
  name: string;
  fallback: React.ReactNode;
}) {
  const slides: Slide[] = [
    ...(main ? [{ src: main, kind: "メイン", caption: "" }] : []),
    ...photos.map((p) => ({ src: `/api/photos/${p.id}/image`, kind: p.kind, caption: p.caption })),
  ];
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState<number | null>(null);

  const key = `${main}|${photos.map((p) => p.id).join(",")}`;
  useEffect(() => {
    strip.current?.scrollTo({ left: 0 });
    setIndex(0);
  }, [key]);

  if (slides.length === 0) return <>{fallback}</>;

  const go = (i: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * Math.max(0, Math.min(slides.length - 1, i)), behavior: "smooth" });
  };
  const kinds = Array.from(new Set(slides.map((s) => s.kind))).filter((k) => k !== "メイン");

  return (
    <div className="relative">
      <div
        ref={strip}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        aria-label={`${name}の写真`}
      >
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setFull(i)}
            className="relative h-60 w-full shrink-0 snap-center bg-slate-100"
            aria-label={`写真 ${i + 1}枚目（${s.kind}）を大きく見る`}
          >
            <img src={s.src} alt={s.caption || `${name} ${s.kind}`} loading={i < 2 ? "eager" : "lazy"} className="h-full w-full object-cover" />
            {(s.kind !== "メイン" || s.caption) && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-left text-white">
                {s.kind !== "メイン" && <span className="mr-1.5 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold backdrop-blur">{s.kind}</span>}
                <span className="text-xs">{s.caption}</span>
              </span>
            )}
          </button>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <span className="num pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-bold text-white">
            {index + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="前の写真"
            className="absolute left-2 top-[6.5rem] hidden h-9 w-9 place-items-center rounded-full bg-white/90 shadow disabled:hidden sm:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === slides.length - 1}
            aria-label="次の写真"
            className="absolute right-2 top-[6.5rem] hidden h-9 w-9 place-items-center rounded-full bg-white/90 shadow disabled:hidden sm:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      {kinds.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto bg-white px-4 pt-3" aria-label="写真の種類">
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">
            <Expand className="h-3.5 w-3.5" aria-hidden />
            写真 {slides.length}枚
          </span>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => go(slides.findIndex((s) => s.kind === k))}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                slides[index]?.kind === k ? "bg-saga-600 text-white ring-saga-600" : "bg-white text-slate-700 ring-slate-200"
              }`}
            >
              {k}（{slides.filter((s) => s.kind === k).length}）
            </button>
          ))}
        </div>
      )}
      {full !== null && createPortal(<Lightbox slides={slides} start={full} name={name} onClose={() => setFull(null)} />, document.body)}
    </div>
  );
}

function Lightbox({ slides, start, name, onClose }: { slides: Slide[]; start: number; name: string; onClose: () => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const el = strip.current;
    if (el) el.scrollTo({ left: el.clientWidth * start });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "ArrowRight" && el) el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
      if (e.key === "ArrowLeft" && el) el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);
  const s = slides[index];
  return (
    <div role="dialog" aria-modal="true" aria-label={`${name}の写真`} className="fixed inset-0 z-[3000] flex flex-col bg-black">
      <div className="flex items-center justify-between px-3 py-2 text-white">
        <span className="num text-sm font-bold">
          {index + 1} / {slides.length}
        </span>
        <button type="button" onClick={onClose} aria-label="写真を閉じる" className="grid h-11 w-11 place-items-center rounded-full bg-white/15">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div
        ref={strip}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((x) => (
          <div key={x.src} className="flex w-full shrink-0 snap-center items-center justify-center">
            <img src={x.src} alt={x.caption || x.kind} className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
      <p className="min-h-[4rem] px-4 py-3 text-sm text-white">
        {s?.kind !== "メイン" && <span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{s?.kind}</span>}
        {s?.caption}
      </p>
    </div>
  );
}
