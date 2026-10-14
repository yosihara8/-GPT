"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Megaphone } from "lucide-react";
import { OPERATOR } from "@/lib/config";

/**
 * SNS・LINE でお店（佐賀観光マップのお店のページ）を宣伝する。
 * 各サービスの「投稿・シェア画面」を開くだけなので、アカウントの連携や API の審査は不要。
 * 投稿文には、お店のページと「佐賀観光マップのお客様登録」（紹介元をこのお店にしたリンク）を必ず入れる。
 * 文章を渡せないサービス（Facebook・Instagram・TikTok・YouTube）は、文章をコピーしてから開く。
 */
export default function SnsShare({ storeId, storeName }: { storeId: number; storeName: string }) {
  const [origin, setOrigin] = useState("");
  const [text, setText] = useState(`${storeName}のクーポンやお店の情報を${OPERATOR.serviceName}で配信中です。地図から経路もすぐ調べられます。`);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);

  const shopUrl = `${origin}/?shop=${storeId}`;
  // 登録すると、紹介元がこのお店になり、登録後にこのお店のページが開く
  const registerUrl = `${origin}/register/customer?ref=${storeId}`;
  const post = `${text}\n\n▼お店のページ（クーポン・地図）\n${shopUrl}\n\n▼${OPERATOR.serviceName}のお客様登録（無料）\n${registerUrl}`;
  const p = encodeURIComponent(post);

  const direct = [
    { label: "LINE", href: `https://line.me/R/share?text=${p}`, cls: "bg-[#06C755] text-white" },
    { label: "Threads", href: `https://www.threads.net/intent/post?text=${p}`, cls: "bg-slate-900 text-white" },
    { label: "X", href: `https://x.com/intent/post?text=${p}`, cls: "bg-black text-white" },
  ];
  // 文章を自動で入れられないサービス：押すと文章をコピーしてから開く
  const pasted = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}`, cls: "bg-[#1877F2] text-white" },
    { label: "Instagram", href: "https://www.instagram.com/", cls: "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white" },
    { label: "TikTok", href: "https://www.tiktok.com/upload", cls: "bg-[#111] text-white" },
    { label: "YouTube", href: "https://www.youtube.com/", cls: "bg-[#FF0000] text-white" },
  ];

  async function copy(target: string) {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(target);
      setTimeout(() => setCopied(null), 6000);
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
          ボタンを押すと、各サービスの投稿画面が開きます。投稿文には、お店のページと「{OPERATOR.serviceName}のお客様登録」のリンクが自動で入ります。登録リンクから会員になった方は、このお店の紹介として数えられます。
        </p>
      </div>
      <textarea className="input text-sm" rows={3} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} aria-label="投稿する文章" />
      <div>
        <p className="mb-1 text-xs font-bold text-slate-600">投稿される文章</p>
        <p className="whitespace-pre-wrap break-all rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700" data-testid="sns-post">
          {post}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {direct.map((x) => (
          <a key={x.label} href={x.href} target="_blank" rel="noreferrer" className={`btn justify-center px-2 text-sm ${x.cls}`}>
            {x.label}
          </a>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs text-slate-500">上の 3 つは文章入りの投稿画面が開きます。下のサービスは、押すと文章をコピーしてから開きます。投稿画面で貼り付けてください。</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pasted.map((x) => (
            <a key={x.label} href={x.href} target="_blank" rel="noreferrer" onClick={() => copy(x.label)} className={`btn justify-center text-sm ${x.cls}`}>
              {x.label}
            </a>
          ))}
        </div>
      </div>
      {copied && copied !== "all" && (
        <p role="status" className="rounded-xl bg-tea-50 px-3 py-2 text-xs font-bold text-tea-700">
          文章とリンクをコピーしました。{copied} の投稿画面で貼り付けてください。
          {copied !== "Facebook" && "（Instagram・TikTok・YouTube の投稿文のリンクは押せないことがあるため、プロフィールのリンク欄にも登録リンクを入れるのがおすすめです）"}
        </p>
      )}
      <button type="button" onClick={() => copy("all")} className="btn-outline w-full">
        {copied === "all" ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied === "all" ? "コピーしました" : "文章とリンクをコピー"}
      </button>
    </section>
  );
}
