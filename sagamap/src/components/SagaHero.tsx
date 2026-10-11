/* eslint-disable @next/next/no-img-element */

/** 佐賀の朝焼けの一枚絵（熱気球・天山・有明海・佐賀城・有田の窯）に見出しを重ねた帯 */
export default function SagaHero({ title, lead, className = "" }: { title: React.ReactNode; lead?: React.ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden bg-[#1F3D73] ${className}`}>
      <img src="/art/panorama.svg" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_50%]" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-[#14284D]/10 via-transparent to-[#14284D]/80" aria-hidden />
      <div className="relative flex min-h-[260px] flex-col justify-end px-5 pb-6 pt-5 sm:min-h-[300px]">
        <p className="num text-[10px] font-bold tracking-[0.3em] text-white/80">SAGA KANKO MAP</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-snug text-white drop-shadow-[0_2px_8px_rgba(10,20,40,0.45)] sm:text-[34px]">{title}</h1>
        {lead && <p className="mt-2 text-sm text-white/90">{lead}</p>}
      </div>
    </section>
  );
}
