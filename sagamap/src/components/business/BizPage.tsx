/**
 * 事業主の画面の共通の枠（深緑の帯に、黄金の小さな線・明朝の見出し・説明）。
 * どの画面も同じ形・同じ余白にして、統一感を出す。形はお客さまの画面の見出し（エリアの色の線＋明朝）とそろえ、
 * 色は深緑と黄金にして、お客さまの画面（藍）とひと目で見分けられるようにする。
 */
export default function BizPage({
  title,
  lead,
  aside,
  overlap = false,
  notice,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** 帯の右側（店舗の切り替えなど） */
  aside?: React.ReactNode;
  /** 帯の下に数字のカードを重ねるとき */
  overlap?: boolean;
  /** 帯よりも上（画面のいちばん上）に出すお知らせ */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-10">
      {notice}
      <div
        className={`karakusa -mx-4 -mt-4 flex flex-wrap items-end justify-between gap-3 bg-saga-600 px-5 pt-6 text-white sm:mx-0 sm:mt-0 sm:rounded-xl ${
          overlap ? "pb-16" : "pb-6"
        }`}
      >
        <div className="min-w-0">
          <span className="flex gap-[3px]" aria-hidden>
            {["#E3B04B", "#F2D58A", "#FFFFFF"].map((c) => (
              <span key={c} className="h-[3px] w-3 rounded-full" style={{ background: c }} />
            ))}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-[0.08em]">{title}</h1>
          {lead && <p className="mt-1 text-sm text-white/80">{lead}</p>}
        </div>
        {aside}
      </div>
      {children}
    </main>
  );
}

/** 店舗が 2 つ以上あるときの切り替え（帯の右側） */
export function StorePicker({ stores, value, onChange }: { stores: { id: number; name: string }[]; value: number | null; onChange: (id: number) => void }) {
  if (stores.length <= 1) return null;
  return (
    <select aria-label="店舗" value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className="input w-auto border-white/20 py-2 text-slate-900">
      {stores.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
