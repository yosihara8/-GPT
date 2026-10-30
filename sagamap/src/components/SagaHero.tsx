/* eslint-disable @next/next/no-img-element */

/**
 * 佐賀の朝焼けの一枚絵（熱気球・天山・有明海・佐賀城・有田の窯）に見出しを重ねた帯。
 * badge で「どなた向けの画面か」を札で出す。tone="business" は事業主向け（深緑の色を重ねて、お客さま向けと見分けやすくする）。
 */
export default function SagaHero({
  title,
  lead,
  eyebrow = "佐賀観光マップ",
  badge,
  tone = "customer",
  className = "",
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  eyebrow?: string;
  badge?: React.ReactNode;
  tone?: "customer" | "business";
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden bg-[#1F3D73] ${className}`}>
      <img src="/art/panorama.svg" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_50%]" aria-hidden />
      <div
        className={`absolute inset-0 bg-gradient-to-b ${tone === "business" ? "from-[#22402E]/70 via-[#22402E]/55 to-[#11231A]/90" : "from-[#14284D]/10 via-transparent to-[#14284D]/80"}`}
        aria-hidden
      />
      <div className="relative flex min-h-[260px] flex-col justify-end px-5 pb-6 pt-5 sm:min-h-[300px]">
        <p className="text-[11px] font-bold tracking-[0.2em] text-white/85">{eyebrow}</p>
        {badge && (
          <p className={`mt-2 w-fit rounded-full px-3 py-1 text-xs font-bold ${tone === "business" ? "bg-[#E3B04B] text-[#11231A]" : "bg-white text-[#1E3A6E]"}`}>{badge}</p>
        )}
        <h1 className="mt-2 text-[28px] font-extrabold leading-snug text-white drop-shadow-[0_2px_8px_rgba(10,20,40,0.45)] sm:text-[34px]">{title}</h1>
        {lead && <p className="mt-2 text-sm text-white/90">{lead}</p>}
      </div>
    </section>
  );
}
