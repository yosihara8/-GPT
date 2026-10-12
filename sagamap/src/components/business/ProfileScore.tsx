"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { profileChecklist, profilePercent, type ProfileStore } from "@/lib/profile";

/**
 * お店のページの充実度（Google のビジネスプロフィールのように、足りない情報を 1 つずつ案内する）。
 * 写真・メニュー・営業時間などがそろうほど、お客さまが「行ってみよう」と決めやすくなる。
 */
export default function ProfileScore({ store, premium }: { store: ProfileStore; premium: boolean }) {
  const items = profileChecklist(store, premium);
  const pct = profilePercent(items);
  const todo = items.filter((i) => !i.done);

  return (
    <section className="card space-y-3" aria-label="お店のページの充実度">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-bold">お店のページの充実度</h2>
          <p className="text-xs text-slate-500">
            {todo.length === 0 ? "すべてそろっています。季節ごとに写真やクーポンを新しくしましょう。" : `あと ${todo.length} 項目で、お客さまに伝わるお店のページになります。`}
          </p>
        </div>
        <p className="num shrink-0 text-3xl font-extrabold text-saga-700">
          {pct}
          <span className="text-base">%</span>
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct === 100 ? "bg-tea-500" : "bg-asa-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="divide-y divide-slate-100">
        {[...todo, ...items.filter((i) => i.done)].map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="flex items-center gap-3 py-2.5">
              {i.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-tea-500" aria-label="済み" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="まだ" />}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-bold ${i.done ? "text-slate-400" : ""}`}>{i.label}</span>
                {!i.done && <span className="block text-xs text-slate-500">{i.hint}</span>}
              </span>
              {!i.done && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
