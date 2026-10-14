"use client";

import { useCallback, useEffect, useState } from "react";
import { Req } from "@/components/FormMarks";
import { api } from "@/lib/fetcher";
import { AMENITIES, CATEGORIES, PRICE_OPTIONS } from "@/lib/config";
import ImagePicker, { type PickedImage } from "@/components/ImagePicker";
import { blobToBase64 } from "@/lib/image";
import PaymentFieldset from "@/components/business/PaymentFieldset";
import { type SpecialDay } from "@/lib/schedule";

/** 事業主：お店の情報の入力（店舗情報・メニュー・店舗の追加） */
export type Owner = { id: number; name: string; email: string; plan: "free" | "premium"; complimentary?: boolean; monthly_price: number; plan_ends_at?: string | null };
export type Store = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  service_description: string;
  contact: string;
  price_level: number;
  crowd_level: number;
  instagram_url: string | null;
  twitter_url: string | null;
  threads_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  weekly_hours?: unknown;
  hours_note?: string;
  special_days?: SpecialDay[];
  has_photo: boolean;
  photo_version: number | null;
  business_hours?: string;
  closed_days?: string;
  amenities?: string[];
  gallery_count?: number;
  menu_count?: number;
  active_coupons?: number;
  payment_methods?: string[];
  payment_none?: string[];
  website_url?: string | null;
  reservation_url?: string | null;
  line_url?: string | null;
};

export function StoreEditor({ store, premium, onSaved }: { store: Store; premium: boolean; onSaved: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body: Record<string, unknown> = {
      name: f.name,
      address: f.address,
      category: f.category,
      serviceDescription: f.serviceDescription,
      contact: f.contact,
      priceLevel: f.priceLevel,
      crowdLevel: f.crowdLevel,
      amenities: new FormData(e.currentTarget).getAll("amenities"),
      paymentMethods: new FormData(e.currentTarget).getAll("paymentMethods"),
      paymentNone: new FormData(e.currentTarget).getAll("paymentNone"),
    };
    if (premium) {
      body.instagramUrl = f.instagramUrl;
      body.twitterUrl = f.twitterUrl;
      body.threadsUrl = f.threadsUrl;
      body.facebookUrl = f.facebookUrl;
      body.youtubeUrl = f.youtubeUrl;
      body.tiktokUrl = f.tiktokUrl;
      body.websiteUrl = f.websiteUrl;
      body.reservationUrl = f.reservationUrl;
      body.lineUrl = f.lineUrl;
    }
    try {
      const res = await api<{ matched?: string }>(`/api/businesses/${store.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setMsg(res.matched ? `保存しました。地図の場所を「${res.matched}」に更新しました` : "保存しました");
      onSaved();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-bold">基本情報</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="店舗名" name="name" defaultValue={store.name} required />
        <div>
          <label className="label">業種</label>
          <select name="category" defaultValue={store.category} className="input">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Input label="住所" name="address" defaultValue={store.address} required />
          <p className="mt-1 text-xs text-slate-500">住所を変更すると、地図の場所も自動で更新されます。</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">サービス内容</label>
          <textarea name="serviceDescription" defaultValue={store.service_description} rows={3} className="input" />
        </div>
        <Input label="連絡先（電話番号など）" name="contact" defaultValue={store.contact} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">価格帯</label>
            <select name="priceLevel" defaultValue={store.price_level} className="input">
              {PRICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">普段の混雑度</label>
            <select name="crowdLevel" defaultValue={store.crowd_level} className="input">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-semibold">お店の特徴（お客さまのお店のページに表示されます）</legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="amenities" value={a} defaultChecked={store.amenities?.includes(a)} className="h-4 w-4 accent-saga-600" />
              {a}
            </label>
          ))}
        </div>
      </fieldset>

      <PaymentFieldset methods={store.payment_methods} none={store.payment_none} />

      <fieldset disabled={!premium} className="space-y-3 rounded-xl border border-slate-200 p-3 disabled:opacity-60">
        <legend className="px-1 text-sm font-semibold">
          予約・LINE・ホームページ・SNS の連携 {!premium && <span className="text-xs font-normal text-amber-700">（有料プラン）</span>}
        </legend>
        <p className="text-xs text-slate-500">
          入れたリンクは、お客さまのお店のページに「予約する」「LINE」「ホームページ」のボタンと SNS のボタンで表示されます。お客さまはワンタップで予約・友だち追加・フォローができます。
        </p>
        <Input label="予約ページの URL" name="reservationUrl" type="url" defaultValue={store.reservation_url ?? ""} placeholder="https://…（ホットペッパー・食べログ・自社予約など）" />
        <div>
          <Input label="LINE 公式アカウント（URL または LINE ID）" name="lineUrl" defaultValue={store.line_url ?? ""} placeholder="https://lin.ee/… または @abc1234" />
          <p className="mt-1 text-xs text-slate-500">LINE ID（@から始まる ID）を入れると、友だち追加のリンクに自動で変換します。</p>
        </div>
        <Input label="ホームページの URL" name="websiteUrl" type="url" defaultValue={store.website_url ?? ""} placeholder="https://…" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Instagram の URL" name="instagramUrl" type="url" defaultValue={store.instagram_url ?? ""} placeholder="https://instagram.com/…" />
          <Input label="Threads の URL" name="threadsUrl" type="url" defaultValue={store.threads_url ?? ""} placeholder="https://www.threads.net/@…" />
          <Input label="Facebook の URL" name="facebookUrl" type="url" defaultValue={store.facebook_url ?? ""} placeholder="https://www.facebook.com/…" />
          <Input label="X（Twitter）の URL" name="twitterUrl" type="url" defaultValue={store.twitter_url ?? ""} placeholder="https://x.com/…" />
          <Input label="YouTube の URL" name="youtubeUrl" type="url" defaultValue={store.youtube_url ?? ""} placeholder="https://www.youtube.com/@…" />
          <Input label="TikTok の URL" name="tiktokUrl" type="url" defaultValue={store.tiktok_url ?? ""} placeholder="https://www.tiktok.com/@…" />
        </div>
      </fieldset>

      {msg && <p className="text-sm text-saga-700">{msg}</p>}
      <button disabled={saving} className="btn-primary">
        {saving ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}

type MenuRow = { id: number; name: string; price: number | null; description: string; has_image: boolean };

/** メニュー・商品の登録（写真・価格。お客さまのお店のページに横スライドで表示） */
export function MenuEditor({ storeId, onChanged }: { storeId: number; onChanged?: () => void }) {
  const [items, setItems] = useState<MenuRow[]>([]);
  const [image, setImage] = useState<PickedImage>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api<{ items: MenuRow[] }>(`/api/businesses/${storeId}/menu`).then((d) => setItems(d.items)), [storeId]);
  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setSaving(true);
    setMsg(null);
    try {
      await api(`/api/businesses/${storeId}/menu`, {
        method: "POST",
        body: JSON.stringify({ ...f, imageBase64: image ? await blobToBase64(image.blob) : undefined }),
      });
      form.reset();
      if (image) URL.revokeObjectURL(image.url);
      setImage(null);
      setMsg("追加しました");
      load();
      onChanged?.();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: number) {
    if (!confirm("このメニュー・商品を削除しますか？")) return;
    await api(`/api/businesses/${storeId}/menu?itemId=${id}`, { method: "DELETE" });
    load();
    onChanged?.();
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">メニュー・商品</h2>
        <p className="text-xs text-slate-500">人気のメニューや商品を、写真と価格つきで載せられます（50 件まで）。お客さまが「行きたい」と思うきっかけになります。</p>
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2">
              {m.has_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/menu/${m.id}/image`} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{m.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {m.price != null && `¥${m.price.toLocaleString()}`}
                  {m.description && `・${m.description}`}
                </span>
              </span>
              <button onClick={() => remove(m.id)} className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="space-y-2 rounded-xl bg-slate-50 p-3">
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <Input label="名前" name="name" required maxLength={60} placeholder="例：佐賀牛ランチ" />
          <Input label="価格（円・税込）" name="price" type="number" min={0} placeholder="1500" />
        </div>
        <Input label="ひとこと説明（任意）" name="description" maxLength={200} placeholder="例：A5 等級の佐賀牛を炭火で" />
        <ImagePicker value={image} onChange={setImage} hint="料理・商品の写真。自動で縮小して保存します。" />
        {msg && <p className="text-sm font-bold text-saga-700">{msg}</p>}
        <button disabled={saving} className="btn-primary w-full">
          {saving ? "追加しています…" : "メニュー・商品を追加する"}
        </button>
      </form>
    </section>
  );
}

export function AddStore({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline w-full">
        ＋ 店舗を追加（有料プラン）
      </button>
    );
  }
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      await api("/api/businesses", {
        method: "POST",
        body: JSON.stringify({
          name: f.name,
          address: f.address,
          category: f.category,
          serviceDescription: f.serviceDescription,
          contact: f.contact,
        }),
      });
      setOpen(false);
      onAdded();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-bold">店舗を追加</h2>
      <Input label="店舗名" name="name" required />
      <Input label="住所" name="address" required placeholder="佐賀県佐賀市駅前中央1丁目4-17" />
      <div>
        <label className="label">業種</label>
        <select name="category" className="input">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Input label="サービス内容" name="serviceDescription" />
      <Input label="連絡先" name="contact" />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn-primary">追加する</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">
          キャンセル
        </button>
      </div>
    </form>
  );
}

export function Input({ label, className = "", ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={props.name}>
        {label}
        {props.required && <Req />}
      </label>
      <input id={props.name} className="input" {...props} />
    </div>
  );
}

