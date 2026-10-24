"use client";

import { useEffect, useState } from "react";
import { Ticket, X } from "lucide-react";
import { api } from "@/lib/fetcher";
import { couponBadge, couponHeadline, type CouponValue } from "@/lib/coupon";
import { useT } from "@/components/LangProvider";

export type UseTarget = CouponValue & { id: number; title: string; conditions?: string | null; shopName: string };

/**
 * クーポンを使う流れ：①確認（誤タップ防止）→ ②画面いっぱいの「利用済」チケットを店員さんに見せる
 * 時計が動いているので、画面の写真（スクリーンショット）ではないことが分かる
 */
export default function CouponUse({ target, onClose, onUsed }: { target: UseTarget | null; onClose: () => void; onUsed?: () => void }) {
  const [step, setStep] = useState<"confirm" | "used">("confirm");
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usedAt, setUsedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setStep("confirm");
    setError(null);
    setUsedAt(null);
  }, [target]);
  useEffect(() => {
    if (step !== "used") return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [step]);

  if (!target) return null;

  async function use() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/coupons/${target!.id}/use`, { method: "POST" });
      setUsedAt(new Date());
      setNow(new Date());
      setStep("used");
      onUsed?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "used" && usedAt) {
    return (
      <div className="karakusa fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-saga-600 p-5" role="dialog" aria-modal="true" aria-label={t("クーポン利用済み")}>
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-[#FAF6EF] text-center shadow-[0_20px_40px_rgba(10,20,40,0.35)]">
          <div className="px-6 pb-6 pt-6">
            <p className="num text-[11px] font-bold tracking-[0.3em] text-asa-500">{t("クーポン")}</p>
            <p className="mt-1 font-mincho text-lg font-bold text-slate-900">{target.shopName}</p>
            {target.coupon_type === "gift" ? (
              <p className="mt-3 text-3xl font-extrabold leading-snug text-tea-600">{target.benefit || t("特典サービス")}</p>
            ) : (
              <p className={`mt-3 font-num font-extrabold leading-none ${couponBadge(target).tone === "gold" ? "text-sun-500" : "text-coupon"}`}>
                {target.coupon_type === "price" && <span className="mr-1 align-middle text-lg font-bold">{t("特別価格")}</span>}
                <span className="text-7xl tracking-tight">{couponBadge(target).main}</span>
                <span className="text-3xl">{couponBadge(target).sub}</span>
              </p>
            )}
            <p className="mt-3 font-mincho text-base font-bold">{target.title}</p>
            {target.conditions && <p className="mt-1 text-sm text-slate-600">{target.conditions}</p>}
            <div className="my-4 border-t-2 border-dashed border-slate-300" aria-hidden />
            <div className="flex items-center justify-center gap-4">
              <span className="flex h-20 w-20 rotate-[-12deg] flex-col items-center justify-center rounded-full border-[3px] border-coupon text-coupon">
                <span className="font-mincho text-lg font-extrabold leading-none">{t("利用済")}</span>
                <span className="num mt-1 text-[10px] font-bold">
                  {usedAt.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}{" "}
                  {usedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">{t("店員さんに、この画面を見せてください")}</p>
                <p className="num mt-1 text-2xl font-bold tabular-nums text-saga-600">{now.toLocaleTimeString("ja-JP")}</p>
                <p className="text-[11px] text-slate-500">{t("時計が動いていれば、今の画面です")}</p>
              </div>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="btn mt-6 w-full max-w-sm bg-white py-3 text-saga-600 hover:bg-slate-50">
          {t("閉じる")}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/50 sm:items-center" role="dialog" aria-modal="true" aria-label={t("クーポンを使う")} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Ticket className="h-5 w-5 text-coupon" aria-hidden />
            {t("このクーポンを使いますか？")}
          </p>
          <button onClick={onClose} aria-label={t("閉じる")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3 rounded-2xl bg-coral-50 p-4">
          <p className="text-xs text-slate-600">{target.shopName}</p>
          <p className="mt-0.5 font-bold text-slate-900">
            <span className="num mr-1.5 text-xl font-extrabold text-coupon">{couponHeadline(target)}</span>
            {target.title}
          </p>
          {target.conditions && <p className="mt-1 text-xs text-slate-600">{target.conditions}</p>}
        </div>
        <p className="mt-3 text-sm text-slate-600">
          <b className="text-slate-900">{t("お店で、お会計の前に")}</b>{t("押してください。使うと「利用済」になり、元に戻せません。")}
        </p>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="btn-outline py-3">
            {t("やめる")}
          </button>
          <button onClick={use} disabled={busy} className="btn-accent py-3 text-base">
            {t(busy ? "処理中…" : "使う")}
          </button>
        </div>
      </div>
    </div>
  );
}
