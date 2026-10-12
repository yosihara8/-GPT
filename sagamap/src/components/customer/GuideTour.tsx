"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type TourStep = { target?: string; title: string; body: string };

const KEY = "sagamap-guide-v1";

/** 使い方ガイドをまだ見ていないか（端末ごと。見られない環境では出さない） */
export function guideUnseen() {
  try {
    return localStorage.getItem(KEY) !== "done";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY, "done");
  } catch {
    /* 保存できなくても動作には影響しない */
  }
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * 使い方ガイド（画面を暗くして、説明する場所だけを明るく照らす）。
 * data-tour="…" の付いた場所を順番に照らす。対象が画面にないステップは飛ばす。
 */
export default function GuideTour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  // 開いた時点で画面にある場所だけを案内する
  const [live, setLive] = useState<TourStep[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = live[Math.min(i, live.length - 1)];

  const measure = useCallback(() => {
    if (!step?.target) return setRect(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
  }, [step]);

  useEffect(() => {
    if (!open) return;
    setI(0);
    setLive(steps.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t = setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  const finish = useCallback(() => {
    markSeen();
    onClose();
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, live.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, live.length]);

  if (!open || !step || typeof document === "undefined") return null;
  const last = i >= live.length - 1;
  // 説明の札は、照らした場所の下（下に余裕がなければ上）に出す
  const vh = window.innerHeight;
  const below = rect ? rect.top + rect.height + 12 : 0;
  const cardTop = rect ? (below + 200 < vh ? below : Math.max(12, rect.top - 212)) : vh / 2 - 110;

  return createPortal(
    <div className="fixed inset-0 z-[2500]" role="dialog" aria-modal="true" aria-label="使い方ガイド">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-sun-400 transition-all duration-300"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(10, 16, 32, 0.72)" }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(10,16,32,0.72)]" aria-hidden />
      )}
      <div
        className="absolute left-1/2 w-[min(92vw,380px)] -translate-x-1/2 rounded-3xl bg-white p-4 shadow-2xl transition-all duration-300"
        style={{ top: cardTop }}
      >
        <div className="flex items-center justify-between">
          <span className="num rounded-full bg-saga-50 px-2.5 py-0.5 text-xs font-bold text-saga-700">
            使い方 {i + 1} / {live.length}
          </span>
          <button type="button" onClick={finish} aria-label="ガイドを閉じる" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-lg font-bold leading-snug">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-3 flex items-center gap-1" aria-hidden>
          {live.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-asa-500" : "w-1.5 bg-slate-200"}`} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {i === 0 ? (
            <button type="button" onClick={finish} className="text-sm font-bold text-slate-500">
              スキップ
            </button>
          ) : (
            <button type="button" onClick={() => setI(i - 1)} className="flex items-center text-sm font-bold text-slate-500">
              <ChevronLeft className="h-4 w-4" aria-hidden />
              戻る
            </button>
          )}
          <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="btn-accent ml-auto rounded-full px-5 py-2.5">
            {last ? "さっそく使ってみる" : "次へ"}
            {!last && <ChevronRight className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
