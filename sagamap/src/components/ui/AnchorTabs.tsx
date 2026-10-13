"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ページ内の目次（上に固定）。押すとその欄へ移動し、いま見ている欄に色を付ける。
 * お客さまのお店のページの目次と同じ見た目。
 */
export default function AnchorTabs({ items, top = 56 }: { items: { id: string; label: string }[]; top?: number }) {
  const [active, setActive] = useState(items[0]?.id);
  const navRef = useRef<HTMLElement>(null);
  // いま見ている欄のボタンが、横に隠れないようにする
  useEffect(() => {
    const nav = navRef.current;
    const btn = nav?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (nav && btn) nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2, behavior: "smooth" });
  }, [active]);
  useEffect(() => {
    const onScroll = () => {
      let cur = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= top + 64) cur = it.id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = items[items.length - 1]?.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items, top]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - top - 56, behavior: "smooth" });
  };
  return (
    <nav
      ref={navRef}
      aria-label="このページの目次"
      className="no-scrollbar sticky z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-cream/95 px-3 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/95 sm:shadow-pop"
      style={{ top }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          data-tab={it.id}
          type="button"
          onClick={() => jump(it.id)}
          aria-current={active === it.id ? "true" : undefined}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${active === it.id ? "bg-saga-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}
