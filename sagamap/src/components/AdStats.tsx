import { Eye, MapPin, MousePointerClick } from "lucide-react";

export type AdStatsData = { view_count?: number; click_count?: number; viewer_count?: number; tapper_count?: number; visitor_count?: number };

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

/**
 * 広告の効果（人数で表示）。地図は会員だけが使うので、数字はすべて会員のお客さま。
 * 見た人 ⊇ タップした人 ⊇ お店に行こうとした人 の順に絞り込まれる。
 */
export default function AdStats({ ad, compact = false }: { ad: AdStatsData; compact?: boolean }) {
  const viewers = ad.viewer_count ?? 0;
  const tappers = ad.tapper_count ?? 0;
  const visitors = ad.visitor_count ?? 0;
  if (compact) {
    return (
      <span className="mt-1 flex flex-wrap gap-1 text-[11px] font-bold" aria-label="広告の効果">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">見た {viewers.toLocaleString()}人</span>
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">タップ {tappers.toLocaleString()}人</span>
        <span className="rounded-md bg-tea-50 px-1.5 py-0.5 text-tea-700">お店へ {visitors.toLocaleString()}人</span>
      </span>
    );
  }
  const items = [
    { icon: Eye, label: "見た人", value: viewers, sub: `表示 ${(ad.view_count ?? 0).toLocaleString()}回` },
    { icon: MousePointerClick, label: "タップした人", value: tappers, sub: `見た人の ${pct(tappers, viewers)}` },
    { icon: MapPin, label: "お店に行こうとした人", value: visitors, sub: `タップした人の ${pct(visitors, tappers)}`, strong: true },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ icon: Icon, label, value, sub, strong }) => (
          <div key={label} className={`rounded-xl px-1.5 py-2 text-center ${strong ? "bg-tea-50 text-tea-700" : "bg-slate-50"}`}>
            <p className="flex min-h-[2rem] items-center justify-center gap-1 text-[11px] font-bold leading-tight text-slate-600">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </p>
            <p className="num text-xl font-bold">
              {value.toLocaleString()}
              <span className="ml-0.5 text-xs font-normal text-slate-500">人</span>
            </p>
            <p className="text-[10px] text-slate-500">{sub}</p>
          </div>
        ))}
      </div>
      <details className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <summary className="cursor-pointer font-bold text-saga-700">数字の見方</summary>
        <ul className="mt-1.5 space-y-1 leading-5">
          <li>
            <b>見た人</b>：地図の画面でこの広告が表示されたお客さまの人数です。同じ人が何回見ても 1 人と数えます（何回表示されたかは「表示 〇回」）。
          </li>
          <li>
            <b>タップした人</b>：広告を押して、お店の情報を開いた人です。タップした人は「見た人」にも入っています。
          </li>
          <li>
            <b>お店に行こうとした人</b>：広告をタップしてから 14 日以内に、道案内・電話・クーポンの利用をした人です。広告が来店につながった目安になります。
          </li>
          <li>地図は会員のお客さまだけが使えるため、数字はすべて会員の人数です。お店の方・運営者が見た分は数えません。</li>
        </ul>
      </details>
    </div>
  );
}
