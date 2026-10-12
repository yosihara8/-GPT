"use client";

import { useState } from "react";
import { PAYMENT_GROUPS } from "@/lib/config";

type State = "unset" | "yes" | "no";

/**
 * お支払い方法の入力（店舗情報フォームの一部）。
 * 種類ごとに「使える（どれが使えるか選ぶ）」「使えない」を選ぶ。フォームには paymentMethods / paymentNone として入る。
 */
export default function PaymentFieldset({ methods = [], none = [] }: { methods?: string[]; none?: string[] }) {
  const [state, setState] = useState<Record<string, State>>(() =>
    Object.fromEntries(
      PAYMENT_GROUPS.map((g) => [g.key, none.includes(g.key) ? "no" : g.items.some((i) => methods.includes(i)) ? "yes" : "unset"]),
    ),
  );
  const [picked, setPicked] = useState<string[]>(methods);
  const toggle = (m: string) => setPicked((xs) => (xs.includes(m) ? xs.filter((x) => x !== m) : [...xs, m]));

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold">お支払い方法（お客さまのお店のページに表示されます）</legend>
      <p className="text-xs text-slate-500">現金以外で使えるものを選んでください。使えない種類は「使えない」を選ぶと、お客さまに「使えません」と表示されます。</p>
      {PAYMENT_GROUPS.map((g) => {
        const st = state[g.key];
        const items = g.items as readonly string[];
        return (
          <div key={g.key} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 flex-1 text-sm font-bold">{g.label}</p>
              <button
                type="button"
                aria-pressed={st === "yes"}
                onClick={() => setState((s) => ({ ...s, [g.key]: "yes" }))}
                className={`${st === "yes" ? "chip-on" : "chip-off"} shrink-0 px-3`}
              >
                使える
              </button>
              <button
                type="button"
                aria-pressed={st === "no"}
                onClick={() => setState((s) => ({ ...s, [g.key]: "no" }))}
                className={`${st === "no" ? "chip-on" : "chip-off"} shrink-0 px-3`}
              >
                使えない
              </button>
            </div>
            {st === "no" && <input type="hidden" name="paymentNone" value={g.key} />}
            {st === "yes" && (
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                  {items.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="paymentMethods" value={m} checked={picked.includes(m)} onChange={() => toggle(m)} className="h-4 w-4 accent-saga-600" />
                      {m}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPicked((xs) => Array.from(new Set([...xs, ...items])))}
                  className="mt-2 text-xs font-bold text-saga-700"
                >
                  {g.key === "transit" ? "全国の交通系IC（10 種類）すべてを選ぶ" : "すべて選ぶ"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
