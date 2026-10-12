"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer } from "lucide-react";
import Logo from "@/components/Logo";
import { useMyStores } from "@/components/StoreSelect";
import { api } from "@/lib/fetcher";
import { couponBadge, type CouponValue } from "@/lib/coupon";

type OwnerCoupon = CouponValue & { id: number; business_id: number; title: string; conditions: string; expires_at: string; is_active: boolean };
type Size = "A4" | "A5";

const SIZES: Record<Size, { w: number; h: number; label: string }> = {
  A4: { w: 210, h: 297, label: "A4 ポスター（壁・入口）" },
  A5: { w: 148, h: 210, label: "A5 卓上 POP（レジ横・テーブル）" },
};

/** レジ横に置く QR ポスター（印刷用）。読み取ると無料登録 → そのお店のページ（クーポン）へ */
export default function PosterPage() {
  const stores = useMyStores();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<OwnerCoupon[]>([]);
  const [couponId, setCouponId] = useState<number | "none" | null>(null);
  const [size, setSize] = useState<Size>("A4");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].id);
  }, [stores, storeId]);
  useEffect(() => {
    api<{ coupons: OwnerCoupon[] }>("/api/coupons")
      .then((d) => setCoupons(d.coupons.filter((c) => c.is_active && new Date(c.expires_at) > new Date())))
      .catch(() => setCoupons([]));
  }, []);

  const store = stores.find((s) => s.id === storeId);
  const mine = useMemo(() => coupons.filter((c) => c.business_id === storeId), [coupons, storeId]);
  const coupon = couponId === "none" ? null : (mine.find((c) => c.id === couponId) ?? mine[0] ?? null);
  const url = `${origin}/p/${storeId ?? ""}`;
  const S = SIZES[size];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 print:m-0 print:max-w-none print:p-0">
      {/* 印刷するときは、ポスターだけを用紙いっぱいに出す */}
      <style>{`@media print { @page { size: ${size} portrait; margin: 0; } }`}</style>
      <div className="space-y-4 print:hidden">
        <Link href="/dashboard/business" className="inline-flex items-center gap-1 text-sm text-slate-600">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          ダッシュボード
        </Link>
        <h1 className="text-2xl font-bold">レジ横 QR ポスター</h1>
        <p className="text-sm text-slate-600">
          印刷してレジ横・入口・テーブルに置くだけ。お客さまがスマホのカメラで読み取ると、無料登録（30 秒）してすぐにクーポンを使えます。
          読み取られた回数はダッシュボードと月次レポートに出ます。登録した方は紹介プログラムにも数えます。
        </p>
        <div className="card grid gap-3 sm:grid-cols-3">
          {stores.length > 1 && (
            <div>
              <label className="label">店舗</label>
              <select className="input" value={storeId ?? ""} onChange={(e) => (setStoreId(Number(e.target.value)), setCouponId(null))}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">載せるクーポン</label>
            <select
              className="input"
              value={coupon ? coupon.id : "none"}
              onChange={(e) => setCouponId(e.target.value === "none" ? "none" : Number(e.target.value))}
            >
              {mine.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
              <option value="none">クーポンを載せない</option>
            </select>
          </div>
          <div>
            <label className="label">大きさ</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SIZES) as Size[]).map((k) => (
                <button key={k} type="button" onClick={() => setSize(k)} aria-pressed={size === k} className={size === k ? "chip-on justify-center" : "chip-off justify-center"}>
                  {k}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{S.label}</p>
          </div>
          <button type="button" onClick={() => window.print()} className="btn-accent sm:col-span-3">
            <Printer className="h-4 w-4" aria-hidden />
            印刷する（PDF に保存もできます）
          </button>
          <p className="text-xs text-slate-500 sm:col-span-3">
            コンビニのネットプリントでも印刷できます（印刷画面で「PDF に保存」→ アップロード）。クーポンを変えたら、ポスターも作り直してください。
          </p>
        </div>
        <p className="text-sm font-bold text-slate-600">見本</p>
      </div>

      {/* ポスター本体（mm 単位。画面では縮小して見本を表示） */}
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200 print:overflow-visible print:rounded-none print:ring-0">
        <div className="origin-top-left print:!scale-100" style={{ width: `${S.w}mm`, height: `${S.h}mm`, transform: "scale(var(--poster-scale, 1))" }}>
          <Poster w={S.w} h={S.h} shopName={store?.name ?? ""} coupon={coupon} url={url} />
        </div>
      </div>
      <PosterScale w={S.w} h={S.h} />
    </main>
  );
}

/** 画面の幅に合わせて見本を縮小する（印刷には影響しない） */
function PosterScale({ w, h }: { w: number; h: number }) {
  useEffect(() => {
    const fit = () => {
      const box = document.querySelector<HTMLElement>("[data-poster-box]")?.parentElement?.parentElement;
      const avail = Math.min((box?.clientWidth ?? 360) - 2, 720);
      const px = (w / 25.4) * 96;
      const scale = Math.min(1, avail / px);
      document.documentElement.style.setProperty("--poster-scale", String(scale));
      const outer = document.querySelector<HTMLElement>("[data-poster-box]")?.parentElement?.parentElement;
      if (outer) outer.style.height = `${(h / 25.4) * 96 * scale}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    const before = () => document.documentElement.style.setProperty("--poster-scale", "1");
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", fit);
    };
  }, [w, h]);
  return null;
}

function Poster({ w, h, shopName, coupon, url }: { w: number; h: number; shopName: string; coupon: OwnerCoupon | null; url: string }) {
  const k = w / 210; // A4 を 1 とした倍率
  const mm = (n: number) => `${n * k}mm`;
  const badge = coupon ? couponBadge(coupon) : null;
  const until = coupon ? new Date(coupon.expires_at).toLocaleDateString("ja-JP", { month: "long", day: "numeric" }) : "";
  return (
    <div data-poster-box className="flex h-full flex-col bg-[#FAF6EF] text-[#1B1F2A]" style={{ width: `${w}mm`, height: `${h}mm` }}>
      {/* 上の帯 */}
      <div className="karakusa flex items-center justify-between bg-[#1E3A6E] text-white" style={{ padding: `${mm(9)} ${mm(12)}` }}>
        <div className="flex items-center" style={{ gap: mm(3) }}>
          <span style={{ width: mm(13), height: mm(13) }} className="block">
            <Logo light className="h-full w-full" />
          </span>
          <span className="font-mincho font-bold" style={{ fontSize: mm(8) }}>
            佐賀観光マップ
          </span>
        </div>
        <span className="rounded-full bg-[#E3B04B] font-bold text-[#1B1F2A]" style={{ fontSize: mm(5), padding: `${mm(1.5)} ${mm(4)}` }}>
          会員限定
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-around text-center" style={{ padding: `${mm(8)} ${mm(14)} ${mm(6)}` }}>
        <p className="font-mincho font-bold leading-tight" style={{ fontSize: mm(11) }}>
          {shopName}
        </p>

        {/* クーポン */}
        {coupon && badge ? (
          <div className="w-full overflow-hidden rounded-[4mm] bg-white" style={{ border: `${mm(0.8)} solid #C43D2B` }}>
            <div className="bg-[#C43D2B] text-white" style={{ padding: `${mm(3)} 0` }}>
              <p className="font-bold" style={{ fontSize: mm(5.5) }}>
                この画面を見せるだけ
              </p>
            </div>
            <div style={{ padding: `${mm(4)} ${mm(6)}` }}>
              <p className="num font-extrabold leading-none text-[#C43D2B]" style={{ fontSize: mm(badge.main.length > 6 ? 17 : 26) }}>
                {badge.main}
                <span style={{ fontSize: mm(9) }}>{badge.sub}</span>
              </p>
              <p className="font-bold" style={{ fontSize: mm(7), marginTop: mm(3) }}>
                {coupon.title}
              </p>
              <p className="text-[#55596a]" style={{ fontSize: mm(4.2), marginTop: mm(1.5) }}>
                {coupon.conditions ? `${coupon.conditions}・` : ""}
                {until}まで
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-[4mm] bg-white" style={{ padding: `${mm(6)}`, border: `${mm(0.6)} solid #1E3A6E` }}>
            <p className="font-bold" style={{ fontSize: mm(9) }}>
              お得なクーポン・お知らせを配信中
            </p>
            <p className="text-[#55596a]" style={{ fontSize: mm(5), marginTop: mm(2) }}>
              営業時間・メニュー・行き方も地図でかんたんに
            </p>
          </div>
        )}

        {/* QR コード */}
        <div className="flex items-center" style={{ gap: mm(8) }}>
          <div className="rounded-[3mm] bg-white" style={{ padding: mm(3), border: `${mm(0.6)} solid #1B1F2A` }}>
            <QRCodeSVG value={url || "https://www.saga-kanko-map.com"} level="M" marginSize={0} style={{ width: mm(78), height: mm(78) }} />
          </div>
          <div className="text-left" style={{ fontSize: mm(5.6) }}>
            {[
              ["1", "スマホのカメラで読み取る"],
              ["2", "無料登録（30 秒）"],
              ["3", coupon ? "クーポン画面を店員に見せる" : "お店のページをチェック"],
            ].map(([n, t]) => (
              <p key={n} className="flex items-center font-bold" style={{ gap: mm(2.5), marginTop: n === "1" ? 0 : mm(4) }}>
                <span
                  className="num grid shrink-0 place-items-center rounded-full bg-[#EE6A3A] text-white"
                  style={{ width: mm(9), height: mm(9), fontSize: mm(5) }}
                >
                  {n}
                </span>
                {t}
              </p>
            ))}
          </div>
        </div>

        <p className="text-[#55596a]" style={{ fontSize: mm(4) }}>
          登録無料・アプリのインストール不要 ／ 近くのお店のクーポンも見つかります
        </p>
      </div>
    </div>
  );
}
