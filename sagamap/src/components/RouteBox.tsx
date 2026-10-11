"use client";

import { Car, Footprints, X } from "lucide-react";
import type { RouteSummary } from "./MapView";
import { formatDistance } from "@/lib/geo";

/** お店の詳細の中に出す「経路」の結果（徒歩・車の切り替えつき） */
export default function RouteBox({
  route,
  loading,
  error,
  mode,
  onMode,
  onClear,
}: {
  route: RouteSummary | null;
  loading: boolean;
  error: string | null;
  mode: "foot" | "car";
  onMode: (m: "foot" | "car") => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-saga-300 bg-saga-50/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg bg-white p-1 text-sm font-semibold shadow-sm">
          {(["foot", "car"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onMode(m)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1 ${mode === m ? "bg-saga-600 text-white" : "text-slate-500"}`}
            >
              {m === "foot" ? <Footprints className="h-4 w-4" aria-hidden /> : <Car className="h-4 w-4" aria-hidden />}
              {m === "foot" ? "徒歩" : "車"}
            </button>
          ))}
        </div>
        <button onClick={onClear} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-white">
          <X className="h-3.5 w-3.5" aria-hidden />
          経路を消す
        </button>
      </div>
      {loading && <p className="mt-2 text-sm font-medium text-saga-600">経路を計算しています…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {route && !loading && (
        <>
          <p className="mt-2 text-lg font-bold">
            {route.mode === "WALKING" ? "徒歩" : "車"}で {formatDistance(route.totalMeters)}・約 {Math.max(1, Math.round(route.totalSeconds / 60))} 分
          </p>
          {route.estimated && <p className="text-xs text-amber-700">道順を取得できなかったため、直線距離からの目安を表示しています。</p>}
          <p className="text-xs text-slate-500">地図に経路を表示しています。</p>
          {route.provider === "osm" && (
            <p className="mt-1 text-[11px] text-slate-400">
              道順データ ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
                OpenStreetMap contributors
              </a>
            </p>
          )}
        </>
      )}
    </div>
  );
}
