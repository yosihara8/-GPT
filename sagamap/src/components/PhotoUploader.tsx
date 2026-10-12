"use client";

import { useState } from "react";
import ShopPhoto from "./ShopPhoto";
import { resizeToJpeg } from "@/lib/image";

type Shop = { id: number; name: string; category: string; has_photo?: boolean; photo_version?: number | null };

export default function PhotoUploader({ shop, onChanged }: { shop: Shop; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await resizeToJpeg(file);
      const res = await fetch(`/api/businesses/${shop.id}/photo`, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      setMsg("写真を登録しました");
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("写真を削除しますか？")) return;
    await fetch(`/api/businesses/${shop.id}/photo`, { method: "DELETE" });
    onChanged();
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">メイン写真（一覧・お店のページの 1 枚目）</h2>
      <ShopPhoto shop={shop} className="h-48 w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <label className={`btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "アップロード中…" : shop.has_photo ? "写真を変更" : "写真を登録"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {shop.has_photo && (
          <button onClick={remove} className="btn-outline">
            削除
          </button>
        )}
      </div>
      {msg && <p className="text-sm font-bold text-tea-700">{msg}</p>}
      <p className="text-xs text-slate-500">お店の外観や看板メニューの写真がおすすめです。一覧のカードに表示され、お店のページでは写真のスライドの 1 枚目になります。</p>
    </section>
  );
}
