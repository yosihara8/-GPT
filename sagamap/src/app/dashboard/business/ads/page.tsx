"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CircleCheck, ImagePlus, X } from "lucide-react";
import PremiumGate from "@/components/PremiumGate";
import StoreSelect, { useMyStores } from "@/components/StoreSelect";
import NotifyCheckbox from "@/components/NotifyCheckbox";
import { api } from "@/lib/fetcher";
import { blobToBase64, resizeToJpeg } from "@/lib/image";

type Ad = {
  id: number;
  headline: string;
  body: string;
  ends_at: string;
  is_active: boolean;
  business_name: string;
  has_image?: boolean;
};
type Done = { headline: string; endsAt: string; notified: number; warnings: string[]; imageUrl: string | null };

export default function AdsPage() {
  return (
    <PremiumGate title="広告出稿">
      <Ads />
    </PremiumGate>
  );
}

function Ads() {
  const stores = useMyStores();
  const [ads, setAds] = useState<Ad[]>([]);
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number } | null>(null);
  const [preview, setPreview] = useState({ headline: "", body: "" });
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const load = useCallback(
    () =>
      api<{ ads: Ad[]; limit: number; used: number; remaining: number }>("/api/ads").then((d) => {
        setAds(d.ads);
        setQuota({ limit: d.limit, used: d.used, remaining: d.remaining });
      }),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function pickImage(file: File) {
    setImageBusy(true);
    setMsg(null);
    try {
      const blob = await resizeToJpeg(file, 1200);
      if (blob.size > 1.5 * 1024 * 1024) throw new Error("画像は 1.5MB 以下にしてください");
      if (image) URL.revokeObjectURL(image.url);
      setImage({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    setMsg(null);
    try {
      const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
      delete f.image;
      const res = await api<{ ad: { ends_at: string }; notified: number; warnings?: string[] }>("/api/ads", {
        method: "POST",
        body: JSON.stringify({ ...f, notify: f.notify === "on", imageBase64: image ? await blobToBase64(image.blob) : undefined }),
      });
      setDone({
        headline: f.headline,
        endsAt: res.ad.ends_at,
        notified: res.notified,
        warnings: res.warnings ?? [],
        imageUrl: image?.url ?? null,
      });
      window.scrollTo({ top: 0 });
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (done) return <Completed done={done} />;

  return (
    <div className="space-y-4">
      {quota && (
        <div className={`card flex items-center justify-between ${quota.remaining === 0 ? "border-sun-400 ring-1 ring-sun-400" : ""}`}>
          <div>
            <p className="font-bold">広告出稿は月 {quota.limit} 回まで</p>
            <p className="text-xs text-slate-500">毎月 1 日〜末日で数えます。翌月 1 日に回数がリセットされます。</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-xs text-slate-500">今月の残り</span>
            <br />
            <b className="text-2xl">{quota.remaining}</b> / {quota.limit} 回
          </p>
        </div>
      )}
      <div>
        <p className="mb-1 text-xs text-slate-500">プレビュー（地図上部に表示されます）</p>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-pop">
          {image && <img src={image.url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
          <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{preview.headline || "見出し"}</span>
            <span className="block truncate text-xs text-slate-600">{preview.body || "本文"}</span>
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card space-y-3">
        <StoreSelect stores={stores} />
        <div>
          <label className="label">見出し（60 文字まで）</label>
          <input name="headline" required maxLength={60} className="input" onChange={(e) => setPreview((p) => ({ ...p, headline: e.target.value }))} />
        </div>
        <div>
          <label className="label">本文（120 文字まで）</label>
          <input name="body" maxLength={120} className="input" onChange={(e) => setPreview((p) => ({ ...p, body: e.target.value }))} />
        </div>
        <div>
          <span className="label">画像（任意）</span>
          {image ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200">
              <img src={image.url} alt="広告画像のプレビュー" className="h-44 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(image.url);
                  setImage(null);
                }}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-pop"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                画像を外す
              </button>
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100 ${imageBusy ? "pointer-events-none opacity-60" : ""}`}
            >
              <ImagePlus className="h-6 w-6 text-saga-600" aria-hidden />
              <span className="font-semibold text-slate-800">{imageBusy ? "画像を準備しています…" : "画像を選ぶ"}</span>
              <span className="text-xs text-slate-500">料理・商品・店内の写真など。自動で縮小して保存します。</span>
              <input
                name="image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickImage(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        <div>
          <label className="label">掲載期間</label>
          <select name="days" defaultValue="30" className="input">
            <option value="7">7 日間</option>
            <option value="14">14 日間</option>
            <option value="30">30 日間</option>
          </select>
        </div>
        <NotifyCheckbox />
        {msg && <p className="whitespace-pre-line text-sm font-bold text-red-600">{msg}</p>}
        <p className="text-xs text-slate-500">
          「日本一」「最安」「No.1」など根拠を示せない表現や、効能をうたう表現は自動チェックで掲載できません（景品表示法・医薬品医療機器等法）。
        </p>
        <button disabled={quota?.remaining === 0 || sending || imageBusy} className="btn-primary w-full">
          {quota?.remaining === 0 ? "今月の出稿回数を使い切りました" : sending ? "出稿しています…" : "出稿する"}
        </button>
      </form>

      {ads.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">出稿した広告</h2>
          <ul className="space-y-2">
            {ads.map((a) => {
              const live = a.is_active && new Date(a.ends_at).getTime() > Date.now();
              return (
                <li key={a.id} className="card flex items-center gap-3">
                  {a.has_image && <img src={`/api/ads/${a.id}/image`} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.headline}</span>
                    <span className="block text-xs text-slate-500">
                      {a.business_name}・{new Date(a.ends_at).toLocaleDateString("ja-JP")}まで
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${live ? "bg-tea-50 text-tea-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {live ? "配信中" : "終了"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** 出稿の完了画面 */
function Completed({ done }: { done: Done }) {
  return (
    <div className="card space-y-4 py-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tea-50 text-tea-600" aria-hidden>
        <CircleCheck className="h-7 w-7" />
      </span>
      <div>
        <h2 className="text-xl font-bold">広告の出稿が完了しました</h2>
        <p className="mt-1 text-sm text-slate-600">地図上部のバナー枠に表示されます。</p>
      </div>
      <div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left">
        {done.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={done.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        )}
        <span className="shrink-0 rounded border border-slate-300 px-1.5 py-px text-[10px] font-semibold tracking-wide text-slate-500">PR</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">{done.headline}</span>
          <span className="block text-xs text-slate-500">{new Date(done.endsAt).toLocaleDateString("ja-JP")} まで掲載</span>
        </span>
      </div>
      {done.notified > 0 && (
        <p className="text-sm text-slate-600">
          お客さま {done.notified} 人のアプリにお知らせしました（メールは毎週金曜にまとめて届きます）。
        </p>
      )}
      {done.warnings.length > 0 && (
        <div className="mx-auto max-w-sm rounded-lg bg-sun-100 px-3 py-2 text-left text-sm text-amber-900">
          <p className="font-semibold">次の点を確認してください（運営者も確認します）</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {done.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <Link href="/dashboard/business" className="btn-primary mx-auto w-full max-w-sm">
        事業主ホームに戻る
      </Link>
    </div>
  );
}
