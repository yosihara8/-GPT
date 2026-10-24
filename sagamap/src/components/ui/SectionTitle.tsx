/**
 * 画面の中の「欄」の見出し（全画面で共通。明朝・17px・左にアイコン・上に英字の小見出し）。
 * カードの中の小見出しは、ゴシックの太字（h2.font-bold）にする。
 */
export default function SectionTitle({
  title,
  icon,
  count,
  note,
  action,
  tone = "default",
  className = "",
}: {
  title: React.ReactNode;
  eyebrow?: string;
  icon?: React.ReactNode;
  count?: number;
  note?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "coupon";
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-2 ${className}`}>
      <div className="min-w-0">
        <h2 className={`flex items-center gap-1.5 font-mincho text-[17px] font-bold ${tone === "coupon" ? "text-coupon" : "text-slate-900"}`}>
          {icon}
          {title}
          {count != null && <span className="num text-xs font-semibold text-slate-400">{count}</span>}
        </h2>
        {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
