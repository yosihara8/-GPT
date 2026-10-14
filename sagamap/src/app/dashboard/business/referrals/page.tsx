"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import PremiumGate from "@/components/PremiumGate";
import { api } from "@/lib/fetcher";

type Data = {
  goal: number;
  standardPrice: number;
  discountPrice: number;
  currentPrice: number;
  thisMonth: { count: number; achieved: boolean; start: string; end: string; next: string };
  lastMonth: { count: number; achieved: boolean };
  history: { month: string; count: number; achieved: boolean }[];
  stores: { id: number; name: string; count: number; url: string }[];
  customers: { registered_at: string; business_name: string }[];
};

/**
 * QR コードを画像（PNG）にして保存する。下に「無料会員登録」と店名を入れる。
 * スマホでは共有メニュー（「画像を保存」で写真に保存できる）、パソコンではダウンロード。
 */
async function saveQrImage(storeId: number, storeName: string) {
  const qr = document.getElementById(`qr-${storeId}`) as HTMLCanvasElement | null;
  if (!qr) return;
  const size = 600;
  const pad = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size + pad * 2;
  canvas.height = size + pad * 2 + 130;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, pad, pad, size, size);
  ctx.fillStyle = "#101828";
  ctx.textAlign = "center";
  ctx.font = 'bold 44px "Noto Sans JP", sans-serif';
  ctx.fillText("無料会員登録", canvas.width / 2, size + pad + 70);
  ctx.fillStyle = "#475467";
  ctx.font = '28px "Noto Sans JP", sans-serif';
  ctx.fillText(`${storeName}（佐賀観光マップ）`, canvas.width / 2, size + pad + 115);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const file = new File([blob], `sagamap-referral-qr-${storeId}.png`, { type: "image/png" });
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "無料会員登録" }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReferralsPage() {
  return (
    <PremiumGate eyebrow="REFERRAL" title="紹介プログラム" lead="お客さまを紹介すると、翌月の月額が安くなります。">
      <Referrals />
    </PremiumGate>
  );
}

function Referrals() {
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => {
    api<Data>("/api/referrals").then(setData);
  }, []);
  if (!data) return <p className="text-sm text-slate-500">読み込み中…</p>;

  const t = data.thisMonth;
  const pct = Math.min(100, (t.count / data.goal) * 100);
  const remaining = Math.max(0, data.goal - t.count);

  async function copy(id: number, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      {/* 仕組みの説明 */}
      <section className="card space-y-2">
        <h2 className="text-lg font-bold">紹介プログラムとは</h2>
        <p className="text-sm leading-7 text-slate-700">
          お店のお客さまに <span className="font-semibold text-saga-600">佐賀観光マップを紹介し、会員登録</span>してもらうプログラムです。
          下の<span className="font-semibold text-saga-600">紹介リンク・QR コード</span>からお客さまが会員登録すると「紹介 1 名」になります。
        </p>
        <ol className="space-y-1 text-sm">
          <li>① 店頭 POP・レジ横・SNS に QR コードやリンクを載せる</li>
          <li>② お客さまが読み取って、佐賀観光マップに無料で会員登録</li>
          <li>
            ③ <span className="font-semibold text-saga-600">毎月 1 日〜末日</span>の紹介人数を数え、<span className="font-semibold text-saga-600">{data.goal} 名以上</span>で
            <span className="font-semibold text-saga-600">
              翌月の月額が {data.standardPrice.toLocaleString()} 円 → {data.discountPrice.toLocaleString()} 円（税込）
            </span>
          </li>
        </ol>
        <p className="text-xs text-slate-500">※ 紹介人数は毎月 1 日に 0 名からカウントし直します。割引は達成した月の翌月 1 か月分です。</p>
      </section>

      {/* 今月の進み具合 */}
      <section className="card">
        <p className="text-sm font-bold text-slate-600">
          今月の紹介人数（{t.start}〜{t.end}）
        </p>
        <p className="mt-1">
          <span className="text-4xl font-bold tabular-nums">{t.count} 名</span>
          <span className="ml-2 text-slate-500">/ 目標 {data.goal} 名</span>
        </p>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={data.goal} aria-valuenow={t.count}>
          <div className="h-full rounded-full bg-saga-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-4 rounded-2xl px-3 py-2 text-sm font-bold ${t.achieved ? "bg-tea-50 text-tea-700" : "bg-sun-100 text-amber-900"}`}>
          {t.achieved
            ? `今月の目標を達成しました！${t.next}の月額は ${data.discountPrice.toLocaleString()} 円（税込）になります`
            : `あと ${remaining} 名の紹介で、${t.next}の月額が ${data.discountPrice.toLocaleString()} 円（税込）になります`}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          今月のご請求額：<b>{data.currentPrice.toLocaleString()} 円（税込）</b>
          {data.lastMonth.achieved ? "（先月の紹介 " + data.lastMonth.count + " 名で割引中）" : ""}
        </p>
      </section>

      {/* 月別の記録 */}
      <section className="card">
        <h2 className="font-bold">月別の紹介人数</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 font-normal">月</th>
              <th className="py-1 font-normal">紹介人数</th>
              <th className="py-1 font-normal">結果</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((h, i) => (
              <tr key={h.month} className="border-t">
                <td className="py-2">
                  {Number(h.month.slice(5))}月{i === 0 && "（今月）"}
                </td>
                <td className="py-2 tabular-nums">{h.count} 名</td>
                <td className="py-2">
                  {h.achieved ? <b className="text-tea-700">達成（翌月割引）</b> : i === 0 ? <span className="text-slate-500">集計中</span> : <span className="text-slate-400">未達成</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 紹介リンク */}
      {data.stores.map((s) => (
        <section key={s.id} className="card flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
              <QRCodeCanvas id={`qr-${s.id}`} value={s.url} size={140} marginSize={1} />
              <p className="mt-1 text-xs font-semibold text-slate-700">無料会員登録</p>
            </div>
            <button onClick={() => saveQrImage(s.id, s.name)} className="btn-outline px-3 py-1.5 text-xs">
              <Download className="h-3.5 w-3.5" aria-hidden />
              QR コードを画像で保存
            </button>
          </div>
          <div className="w-full min-w-0 flex-1">
            <p className="text-sm text-slate-500">
              {s.name} の紹介リンク（今月 {s.count} 名）
            </p>
            <p className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-sm">{s.url}</p>
            <button onClick={() => copy(s.id, s.url)} className="btn-primary mt-2">
              {copied === s.id ? "コピーしました" : "リンクをコピー"}
            </button>
            <p className="mt-2 text-xs text-slate-500">店頭 POP・SNS・ショップカードに QR コードを載せてご活用ください。</p>
          </div>
        </section>
      ))}

      <section className="card">
        <h2 className="font-bold">紹介で登録したお客さま</h2>
        <p className="mt-1 text-xs text-slate-500">お客さまの個人情報を守るため、お名前・メールアドレスは表示しません（登録日と、どのお店の紹介かだけを表示します）。</p>
        {data.customers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">まだ紹介はありません。</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 font-normal">登録日</th>
                <th className="py-1 font-normal">紹介したお店</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-2 tabular-nums">{new Date(c.registered_at).toLocaleDateString("ja-JP")}</td>
                  <td className="truncate py-2">{c.business_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
