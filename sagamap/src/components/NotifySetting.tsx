"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useT } from "@/components/LangProvider";

/** お知らせメールの受信設定（お客さま） */
export default function NotifySetting() {
  const t = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ notifyEnabled: boolean }>("/api/account/notify").then((d) => setEnabled(d.notifyEnabled));
  }, []);
  if (enabled === null) return null;

  async function toggle() {
    const next = !enabled;
    await api("/api/account/notify", { method: "PATCH", body: JSON.stringify({ notifyEnabled: next }) });
    setEnabled(next);
  }

  return (
    <section className="card flex items-center justify-between gap-3">
      <div>
        <h2 className="font-bold">{t("お知らせメール")}</h2>
        <p className="text-xs text-slate-600">{t("毎週金曜日に、新着クーポン・お店のお知らせをまとめてお届けします。")}</p>
      </div>
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${enabled ? "bg-tea-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? "left-7" : "left-1"}`} />
        <span className="sr-only">{enabled ? t("受け取る") : t("受け取らない")}</span>
      </button>
    </section>
  );
}
