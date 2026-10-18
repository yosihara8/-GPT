import { areaOf } from "@/lib/areas";

/** エリアの色札と市町名（例：［中部エリア］【佐賀市】） */
export default function AreaTag({ address, className = "" }: { address?: string | null; className?: string }) {
  const a = areaOf(address);
  if (!a) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`rounded-full px-2 py-[1px] text-[10px] font-bold tracking-wide ${a.area.cls}`}>{a.area.name}エリア</span>
      <span className="text-[11px] text-slate-500">{a.town}</span>
    </span>
  );
}
