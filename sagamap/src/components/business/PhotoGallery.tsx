"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ImagePlus, Images, Trash2 } from "lucide-react";
import { api } from "@/lib/fetcher";
import { blobToBase64, resizeToJpeg } from "@/lib/image";
import { PHOTO_KINDS, PHOTO_LIMIT } from "@/lib/config";

type Photo = { id: number; kind: string; caption: string };

/**
 * お店の写真（外観・店内・客席・商品・雑貨など）。
 * まとめて選んで追加でき、並び順・種類を変えられる。お客さまのお店のページで横にスライドして見られる。
 */
export default function PhotoGallery({ storeId, premium, onChanged }: { storeId: number; premium: boolean; onChanged?: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [kind, setKind] = useState<string>("外観");
  const [caption, setCaption] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const limit = premium ? PHOTO_LIMIT.premium : PHOTO_LIMIT.free;

  const load = useCallback(() => api<{ photos: Photo[] }>(`/api/businesses/${storeId}/photos`).then((d) => setPhotos(d.photos)), [storeId]);
  useEffect(() => {
    load();
  }, [load]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setMsg(null);
    const list = Array.from(files).slice(0, Math.max(0, limit - photos.length));
    if (list.length === 0) {
      setMsg(`写真は ${limit} 枚までです`);
      return;
    }
    let done = 0;
    try {
      for (const f of list) {
        setBusy(`${done + 1} / ${list.length} 枚目を追加しています…`);
        const blob = await resizeToJpeg(f, 1600);
        await api(`/api/businesses/${storeId}/photos`, {
          method: "POST",
          body: JSON.stringify({ kind, caption, imageBase64: await blobToBase64(blob) }),
        });
        done++;
      }
      setCaption("");
      setMsg(`${done} 枚追加しました${files.length > list.length ? `（上限 ${limit} 枚のため ${files.length - list.length} 枚は追加していません）` : ""}`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
      onChanged?.();
    }
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...photos];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setPhotos(next);
    await api(`/api/businesses/${storeId}/photos`, { method: "PATCH", body: JSON.stringify({ order: next.map((p) => p.id) }) });
  }
  async function changeKind(p: Photo, k: string) {
    setPhotos((xs) => xs.map((x) => (x.id === p.id ? { ...x, kind: k } : x)));
    await api(`/api/businesses/${storeId}/photos`, { method: "PATCH", body: JSON.stringify({ photoId: p.id, kind: k }) });
  }
  async function editCaption(p: Photo) {
    const next = prompt("写真のひとこと（60 文字まで）", p.caption);
    if (next === null) return;
    try {
      await api(`/api/businesses/${storeId}/photos`, { method: "PATCH", body: JSON.stringify({ photoId: p.id, caption: next.slice(0, 60) }) });
      setPhotos((xs) => xs.map((x) => (x.id === p.id ? { ...x, caption: next.slice(0, 60) } : x)));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function remove(p: Photo) {
    if (!confirm("この写真を削除しますか？")) return;
    await api(`/api/businesses/${storeId}/photos?photoId=${p.id}`, { method: "DELETE" });
    load();
    onChanged?.();
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="flex items-center gap-1.5 font-bold">
          <Images className="h-4 w-4 text-saga-600" aria-hidden />
          お店の写真
          <span className="num ml-auto text-sm font-normal text-slate-500">
            {photos.length} / {limit} 枚
          </span>
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          外観・店内・客席・料理や商品・雑貨など、お店の中が分かる写真を載せましょう。お客さまはお店のページで横にスライドして見られます。いちばん左の写真が最初に表示されます。
        </p>
        {!premium && (
          <p className="mt-1 text-xs text-amber-700">
            無料プランは {PHOTO_LIMIT.free} 枚まで。
            <Link href="/upgrade" className="underline">
              有料プラン
            </Link>
            なら {PHOTO_LIMIT.premium} 枚まで載せられます。
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative">
                <img src={`/api/photos/${p.id}/image`} alt={p.caption || p.kind} className="aspect-[4/3] w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                  {i === 0 ? "最初に表示・" : ""}
                  {p.kind}
                </span>
              </div>
              <div className="space-y-1.5 p-2">
                <button type="button" onClick={() => editCaption(p)} className="block w-full truncate text-left text-xs text-slate-600 underline-offset-2 hover:underline">
                  {p.caption || <span className="text-saga-700">＋ ひとことを書く</span>}
                </button>
                <select value={p.kind} onChange={(e) => changeKind(p, e.target.value)} aria-label="写真の種類" className="input px-2 py-1 text-xs">
                  {PHOTO_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="左へ" className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-30">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === photos.length - 1}
                    aria-label="右へ"
                    className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-30"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(p)} aria-label="削除" className="ml-auto rounded-lg border border-slate-300 p-1.5 text-slate-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-semibold">写真を追加する</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="写真の種類">
          {PHOTO_KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={kind === k ? "chip-on" : "chip-off"}>
              {k}
            </button>
          ))}
        </div>
        <input className="input" maxLength={60} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="ひとこと（任意）例：窓から有明海が見えるカウンター席" />
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} aria-label="写真を選ぶ" />
        <button type="button" disabled={!!busy || photos.length >= limit} onClick={() => fileRef.current?.click()} className="btn-primary w-full">
          <ImagePlus className="h-4 w-4" aria-hidden />
          {busy ?? (photos.length >= limit ? `上限の ${limit} 枚です` : `「${kind}」の写真を選ぶ`)}
        </button>
        <p className="text-center text-xs text-slate-500">何枚かまとめて選べます。自動で縮小して保存します。</p>
        {msg && <p className="text-sm font-bold text-saga-700">{msg}</p>}
      </div>
    </section>
  );
}
