"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { resizeToJpeg } from "@/lib/image";

export type PickedImage = { blob: Blob; url: string } | null;

/** 写真を選んで縮小し、プレビューする（広告・クーポンで共通） */
export default function ImagePicker({
  value,
  onChange,
  hint = "料理・商品・店内の写真など。自動で縮小して保存します。",
}: {
  value: PickedImage;
  onChange: (v: PickedImage) => void;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setError(null);
    try {
      const blob = await resizeToJpeg(file, 1200);
      if (blob.size > 1.5 * 1024 * 1024) throw new Error("画像は 1.5MB 以下にしてください");
      if (value) URL.revokeObjectURL(value.url);
      onChange({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="label">写真（任意）</span>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          <img src={value.url} alt="写真のプレビュー" className="h-44 w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(value.url);
              onChange(null);
            }}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-pop"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            写真を外す
          </button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 hover:bg-slate-100 ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <ImagePlus className="h-6 w-6 text-saga-600" aria-hidden />
          <span className="font-semibold text-slate-800">{busy ? "写真を準備しています…" : "写真を選ぶ"}</span>
          <span className="text-xs text-slate-500">{hint}</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pick(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
