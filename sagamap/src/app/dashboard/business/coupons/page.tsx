"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import PremiumGate from "@/components/PremiumGate";
import StoreSelect, { useMyStores } from "@/components/StoreSelect";
import NotifyCheckbox from "@/components/NotifyCheckbox";
import ImagePicker, { type PickedImage } from "@/components/ImagePicker";
import CouponRow from "@/components/CouponRow";
import { api } from "@/lib/fetcher";
import { eventPeriod, type SagaEvent } from "@/lib/events";
import { blobToBase64 } from "@/lib/image";
import { COUPON_TYPES, COUPON_TYPE_LABELS, type CouponType, type CouponValue } from "@/lib/coupon";

type Coupon = CouponValue & {
  id: number;
  title: string;
  conditions: string;
  expires_at: string;
  business_name: string;
  used_count: number;
  has_image?: boolean;
};

export default function CouponsPage() {
  return (
    <PremiumGate title="クーポン発行">
      <Coupons />
    </PremiumGate>
  );
}

/** クーポンの使い方（事業主向けの説明） */
function HowToUse() {
  return (
    <details className="group card p-0" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-bold">
          <BookOpen className="h-5 w-5 text-saga-600" aria-hidden />
          クーポンの使い方
        </span>
        <span className="text-sm font-medium text-saga-600">
          <span className="group-open:hidden">開く</span>
          <span className="hidden group-open:inline">閉じる</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 text-sm text-slate-700">
        <ol className="space-y-2">
          <li>
            <b className="text-saga-600">① 発行する</b>
            <br />
            下のフォームで<b>クーポンの種類</b>（％引き・円引き・特別価格・特典サービス）を選び、タイトル・有効期限・利用条件を入れて「発行する」を押します。写真を付けると目に留まりやすくなります。先着人数や「初めての方限定」「何度でも使える」も選べます。
          </li>
          <li>
            <b className="text-saga-600">② お客さまに届く</b>
            <br />
            地図のお店のピンに「クーポン発行中」と表示されます。「お客さまに自動でお知らせする」にチェックすると、お客さまのアプリにお知らせが届き、毎週金曜のメールにも載ります。
          </li>
          <li>
            <b className="text-saga-600">③ お店で使ってもらう</b>
            <br />
            お客さまはお店でクーポンの「使う」を押し、「クーポンを利用しました」の画面を店員さんに見せます。画面のクーポン名と内容（割引・特典）を確認して、提供してください。ふつうは 1 人 1 回、「何度でも使える」にしたクーポンは 1 日 1 回まで使えます。
          </li>
          <li>
            <b className="text-saga-600">④ 結果を見る</b>
            <br />
            使われた回数は、この画面の一覧とダッシュボードで確認できます。
          </li>
        </ol>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>有効期限を過ぎると、お客さまの画面から自動で消えます。</li>
          <li>「削除」を押すと、すぐにお客さまの画面から消えます（それまでの利用回数の記録は残ります）。</li>
          <li>内容を変えたいときは、削除してから発行し直してください。</li>
        </ul>
      </div>
    </details>
  );
}

function Coupons() {
  const stores = useMyStores();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [image, setImage] = useState<PickedImage>(null);
  const [type, setType] = useState<CouponType>("percent");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgIsError, setMsgIsError] = useState(false);
  const load = useCallback(() => api<{ coupons: Coupon[] }>("/api/coupons").then((d) => setCoupons(d.coupons)), []);
  useEffect(() => {
    load();
  }, [load]);
  // イベント特集（開催中・もうすぐ）。選ぶとイベント限定クーポンになり、特集ページにまとめて載る
  const [events, setEvents] = useState<SagaEvent[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api<{ events: SagaEvent[] }>("/api/events").then((d) => setEvents(d.events)).catch(() => setEvents([]));
  }, []);

  const defaultExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setSending(true);
    try {
      const res = await api<{ notified: number; warnings?: string[] }>("/api/coupons", {
        method: "POST",
        body: JSON.stringify({
          ...f,
          couponType: type,
          notify: f.notify === "on",
          repeatable: f.repeatable === "on",
          firstVisitOnly: f.firstVisitOnly === "on",
          expiresAt: `${f.expiresAt}T23:59:59+09:00`,
          imageBase64: image ? await blobToBase64(image.blob) : undefined,
          eventId: eventId ?? undefined,
        }),
      });
      setMsgIsError(false);
      setMsg(
        `クーポンを発行しました。${res.notified ? `お客さま ${res.notified} 人のアプリにお知らせしました（メールは毎週金曜にまとめて届きます）` : ""}` +
          (res.warnings?.length ? `\n\n次の点を確認してください（運営者も確認します）：\n・${res.warnings.join("\n・")}` : ""),
      );
      form.reset();
      setEventId(null);
      if (image) URL.revokeObjectURL(image.url);
      setImage(null);
      load();
    } catch (err) {
      setMsgIsError(true);
      setMsg((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function remove(c: Coupon) {
    if (!confirm(`クーポン「${c.title}」を削除しますか？\nお客さまの画面からすぐに消えます。`)) return;
    try {
      await api(`/api/coupons/${c.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <HowToUse />

      <form onSubmit={onSubmit} className="card space-y-3">
        <StoreSelect stores={stores} />
        <fieldset>
          <legend className="label">クーポンの種類</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COUPON_TYPES.map((t) => (
              <label
                key={t}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-bold ${type === t ? "border-saga-600 bg-saga-50 text-saga-700 ring-2 ring-saga-100" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <input type="radio" name="couponTypeRadio" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                {COUPON_TYPE_LABELS[t].name}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{COUPON_TYPE_LABELS[t].example}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label">タイトル</label>
          <input
            name="title"
            required
            className="input"
            placeholder={{ percent: "ランチ 10%OFF", yen: "お会計から 500円引き", price: "限定ランチセット", gift: "トッピング 1 品無料" }[type]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {type === "percent" && (
            <div>
              <label className="label">割引率（%）</label>
              <input name="discountRate" type="number" min={1} max={100} defaultValue={10} required className="input" />
            </div>
          )}
          {type === "yen" && (
            <div>
              <label className="label">値引きの金額（円）</label>
              <input name="amountYen" type="number" min={1} defaultValue={500} required className="input" />
            </div>
          )}
          {type === "price" && (
            <>
              <div>
                <label className="label">特別価格（円・税込）</label>
                <input name="specialPrice" type="number" min={0} required className="input" placeholder="980" />
              </div>
              <div>
                <label className="label">通常価格（円・任意）</label>
                <input name="regularPrice" type="number" min={1} className="input" placeholder="1200" />
                <p className="mt-1 text-[11px] text-slate-500">実際にふだん売っている価格だけを書いてください（景品表示法）。</p>
              </div>
            </>
          )}
          {type === "gift" && (
            <div className="col-span-2">
              <label className="label">特典の内容</label>
              <input name="benefit" required maxLength={60} className="input" placeholder="例：トッピング 1 品無料／1 ドリンクサービス／デザート付き" />
            </div>
          )}
          <div>
            <label className="label">有効期限</label>
            <input ref={expiryRef} name="expiresAt" type="date" defaultValue={defaultExpiry} required className="input" />
          </div>
        </div>
        <div>
          <label className="label">利用条件</label>
          <input name="conditions" className="input" placeholder="平日 11:00-14:00、1 会計 1 回まで" />
        </div>
        {events.length > 0 && (
          <div className="rounded-xl border-2 border-asa-500/40 bg-asa-50 p-3">
            <p className="text-sm font-bold text-asa-700">イベント限定クーポンにする（任意）</p>
            <p className="text-xs text-slate-600">選ぶと、イベント特集のページと地図の画面の特集にまとめて載ります。期限はイベントの最終日になります。</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEventId(null)} aria-pressed={eventId === null} className={eventId === null ? "chip-on" : "chip-off"}>
                しない
              </button>
              {events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  aria-pressed={eventId === ev.id}
                  onClick={() => {
                    setEventId(ev.id);
                    if (expiryRef.current) expiryRef.current.value = ev.ends_on;
                  }}
                  className={eventId === ev.id ? "chip bg-asa-500 text-white" : "chip-off"}
                >
                  {ev.title}（{eventPeriod(ev)}）
                </button>
              ))}
            </div>
          </div>
        )}
        <details className="rounded-xl bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-bold text-saga-600">使い方の設定（先着人数・初めての方限定・何度でも）</summary>
          <div className="mt-2 space-y-2 pb-1">
            <div>
              <label className="label">先着の人数（任意）</label>
              <input name="maxUses" type="number" min={1} className="input" placeholder="例：30（空欄なら人数の制限なし）" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="firstVisitOnly" className="mt-0.5 h-5 w-5 accent-saga-600" />
              <span>
                <b>初めての方限定</b>
                <span className="block text-xs text-slate-500">このお店のクーポンを使ったことがない人だけが使えます。</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="repeatable" className="mt-0.5 h-5 w-5 accent-saga-600" />
              <span>
                <b>何度でも使える（1 日 1 回まで）</b>
                <span className="block text-xs text-slate-500">常連さん向けのサービスに。チェックしないときは 1 人 1 回です。</span>
              </span>
            </label>
          </div>
        </details>
        <ImagePicker value={image} onChange={setImage} hint="クーポン対象の料理・商品の写真など。自動で縮小して保存します。" />
        <NotifyCheckbox />
        {msg && <p className={`whitespace-pre-line text-sm font-bold ${msgIsError ? "text-red-600" : "text-tea-700"}`}>{msg}</p>}
        <p className="text-xs text-slate-500">
          「日本一」「最安」「No.1」など根拠を示せない表現や、効能をうたう表現は自動チェックで掲載できません（景品表示法・医薬品医療機器等法）。
        </p>
        <button disabled={sending} className="btn-accent w-full">
          {sending ? "発行しています…" : "発行する"}
        </button>
      </form>

      {coupons.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-700">発行したクーポン</h2>
          {coupons.map((c) => {
            const expired = new Date(c.expires_at).getTime() < Date.now();
            return (
              <div key={c.id} className={expired ? "opacity-60" : ""}>
                <CouponRow
                  coupon={c}
                  note={
                    <span className="block text-xs text-slate-500">
                      {c.business_name}・利用 <b className="text-slate-900">{c.used_count}</b> 回{expired && "・期限切れ"}
                    </span>
                  }
                  action={
                    <button
                      onClick={() => remove(c)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      削除
                    </button>
                  }
                />
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
