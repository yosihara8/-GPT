"use client";

import { useRef, useState } from "react";
import { PRICE_LEVEL_LABELS, categoryEmoji } from "@/lib/config";

export type RecCard = {
  id: number;
  name: string;
  category: string;
  service_description: string;
  price_level: number;
  best_discount: number | null;
  reasons: string[];
  walk_minutes: number | null;
  score: number;
};

type Props = {
  cards: RecCard[];
  /** 右スワイプ = 行きたい / 左スワイプ = スキップ */
  onSwipe?: (card: RecCard, liked: boolean) => void;
  onOpen?: (card: RecCard) => void;
};

const THRESHOLD = 100;

/** Tinder 風のスワイプ式おすすめカード（タッチ・マウス・ボタン操作に対応） */
export default function SwipeCards({ cards, onSwipe, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  /** 触れ始めた位置と、横スワイプ中か（縦に動かしたときは画面のスクロールに任せる） */
  const start = useRef<{ x: number; y: number; mode: "undecided" | "swipe" | "scroll" } | null>(null);

  const card = cards[index];
  const next = cards[index + 1];

  const finish = (dir: 1 | -1) => {
    if (!card) return;
    setLeaving(dir);
    onSwipe?.(card, dir === 1);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setDx(0);
      setLeaving(0);
    }, 250);
  };

  if (!card) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
        <p>おすすめをすべて見ました</p>
        <button className="mt-3 text-saga-600 underline" onClick={() => setIndex(0)}>
          最初から見る
        </button>
      </div>
    );
  }

  const offset = leaving ? leaving * 500 : dx;
  return (
    <div>
      <div className="relative h-72 select-none">
        {next && <Card card={next} className="scale-95 opacity-70" />}
        <Card
          card={card}
          style={{
            transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
            transition: start.current === null ? "transform .25s ease" : "none",
          }}
          badge={dx > 40 ? "like" : dx < -40 ? "nope" : null}
          onPointerDown={(e) => {
            start.current = { x: e.clientX, y: e.clientY, mode: "undecided" };
          }}
          onPointerMove={(e) => {
            const st = start.current;
            if (!st || st.mode === "scroll") return;
            const mx = e.clientX - st.x;
            const my = e.clientY - st.y;
            if (st.mode === "undecided" && Math.hypot(mx, my) > 8) {
              // 縦方向の動きなら画面のスクロール、横方向ならスワイプ
              st.mode = Math.abs(my) > Math.abs(mx) ? "scroll" : "swipe";
              if (st.mode === "swipe") (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            }
            if (st.mode === "swipe") setDx(mx);
          }}
          onPointerUp={() => {
            const st = start.current;
            start.current = null;
            if (st?.mode === "swipe") {
              if (dx > THRESHOLD) finish(1);
              else if (dx < -THRESHOLD) finish(-1);
              else setDx(0);
            } else if (st?.mode === "undecided") {
              onOpen?.(card); // タップで詳細を開く
            }
          }}
          onPointerCancel={() => {
            // ブラウザが縦スクロールを始めたとき
            start.current = null;
            setDx(0);
          }}
        />
      </div>
      <div className="mt-4 flex justify-center gap-6">
        <button
          aria-label="スキップ"
          onClick={() => finish(-1)}
          className="h-14 w-14 rounded-full border border-slate-300 bg-white text-2xl text-slate-500 shadow"
        >
          ✕
        </button>
        <button
          aria-label="行きたい"
          onClick={() => finish(1)}
          className="h-14 w-14 rounded-full bg-coupon text-2xl text-white shadow"
        >
          ♥
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        {index + 1} / {cards.length}　タップで詳しく見る・右スワイプで「行きたい」・左でスキップ
      </p>
    </div>
  );
}

function Card({
  card,
  className = "",
  style,
  badge,
  ...handlers
}: {
  card: RecCard;
  className?: string;
  style?: React.CSSProperties;
  badge?: "like" | "nope" | null;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...handlers}
      style={style}
      className={`absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-white via-white to-sun-100 p-5 shadow-pop ${className}`}
    >
      <span className="pointer-events-none absolute -bottom-4 -right-2 text-8xl opacity-20" aria-hidden>
        {categoryEmoji(card.category)}
      </span>
      {badge && (
        <span
          className={`absolute right-4 top-4 rotate-12 rounded border-2 px-2 py-0.5 text-sm font-bold ${
            badge === "like" ? "border-coupon text-coupon" : "border-slate-400 text-slate-500"
          }`}
        >
          {badge === "like" ? "行きたい" : "スキップ"}
        </span>
      )}
      <p className="text-xs font-bold text-saga-600">
        {categoryEmoji(card.category)} {card.category}　{PRICE_LEVEL_LABELS[card.price_level]}
      </p>
      <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{card.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{card.service_description}</p>
      {card.best_discount && (
        <p className="mt-3 inline-block rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-coupon">
          {card.best_discount}% OFF クーポン
        </p>
      )}
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {card.reasons.map((r) => (
          <li key={r} className="rounded-full bg-saga-50 px-2 py-0.5 text-xs text-saga-700">
            {r}
          </li>
        ))}
      </ul>
      {card.walk_minutes != null && (
        <p className="absolute bottom-4 left-5 text-sm text-slate-500">現在地から徒歩約 {card.walk_minutes} 分</p>
      )}
    </div>
  );
}
