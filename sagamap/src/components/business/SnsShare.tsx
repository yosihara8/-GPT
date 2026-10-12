"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Megaphone } from "lucide-react";
import { OPERATOR } from "@/lib/config";

/**
 * SNS・LINE でお店（佐賀観光マップのお店のページ）を宣伝する。
 * 各サービスの「投稿・シェア画面」を開くだけなので、アカウントの連携や API の審査は不要。
 */
export default function SnsShare({ storeId, storeName }: { storeId: number; storeName: string }) {
  const [origin, setOrigin] = useState("");
  const [text, setText] = useState(`${storeName}のクーポンやお店の情報を${OPERATOR.serviceName}で配信中です。地図から経路もすぐ調べられます。`);
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/?shop=${storeId}`;
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  const targets = [
    { label: "LINE で送る", href: `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}`, cls: "bg-[#06C755] text-white" },
    { label: "Threads に投稿", href: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text}\n${url}`)}`, cls: "bg-slate-900 text-white" },
    { label: "Facebook でシェア", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, cls: "bg-[#1877F2] text-white" },
    { label: "X に投稿", href: `https://x.com/intent/post?text=${t}&url=${u}`, cls: "bg-black text-white" },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* コピーできない端末では何もしない */
    }
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="flex items-center gap-1.5 font-bold">
          <Megaphone className="h-4 w-4 text-saga-600" aria-hidden />
          SNS・LINE でお店を宣伝する
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          ボタンを押すと、各サービスの投稿画面が開きます（文章とお店のページのリンク入り）。常連さんやフォロワーに、クーポンとお店の場所をそのまま届けられます。
        </p>
      </div>
      <textarea className="input text-sm" rows={3} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} aria-label="投稿する文章" />
      <div className="grid grid-cols-2 gap-2">
        {targets.map((x) => (
          <a key={x.label} href={x.href} target="_blank" rel="noreferrer" className={`btn justify-center text-sm ${x.cls}`}>
            {x.label}
          </a>
        ))}
      </div>
      <button type="button" onClick={copy} className="btn-outline w-full">
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? "コピーしました（Instagram などに貼り付けできます）" : "文章とリンクをコピー"}
      </button>
    </section>
  );
}
