import { haversineMeters, type LatLng } from "./geo";
import { WALK_METERS_PER_MIN } from "./config";
import { OPERATOR } from "./config";

export type RouteMode = "foot" | "car";
export type RoutePoint = LatLng & { name: string };
export type RouteResult = {
  mode: RouteMode;
  /** 入力した地点の、巡る順番（先頭は出発地） */
  order: number[];
  legs: { distance: number; duration: number }[];
  distance: number;
  duration: number;
  /** 道に沿った線 [lat, lng][] */
  geometry: [number, number][];
  /** 道順が取得できず、直線で概算した場合 true */
  estimated: boolean;
};

/** OpenStreetMap の道路データを使う無料の道案内サーバー（FOSSGIS 運営の OSRM） */
const OSRM_BASE: Record<RouteMode, string> = {
  foot: "https://routing.openstreetmap.de/routed-foot",
  car: "https://routing.openstreetmap.de/routed-car",
};
const CAR_METERS_PER_MIN = 500; // 約 30km/h（概算用）

async function osrm(mode: RouteMode, service: "trip" | "route", points: LatLng[], params: string) {
  const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
  const res = await fetch(`${OSRM_BASE[mode]}/${service}/v1/driving/${coords}?${params}`, {
    headers: { "User-Agent": `SagaMap/1.0 (${OPERATOR.email})` },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OSRM ${service} ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM ${service} ${data.code}`);
  return data;
}

/** 出発地から近い順に巡る順番（道順が取れないときの代わり） */
export function nearestNeighborOrder(points: LatLng[]) {
  const rest = points.map((_, i) => i).slice(1);
  const order = [0];
  while (rest.length) {
    const last = points[order[order.length - 1]];
    rest.sort((a, b) => haversineMeters(last, points[a]) - haversineMeters(last, points[b]));
    order.push(rest.shift()!);
  }
  return order;
}

/** 直線距離による概算ルート */
export function estimateRoute(points: LatLng[], mode: RouteMode): RouteResult {
  const order = nearestNeighborOrder(points);
  const speed = mode === "foot" ? WALK_METERS_PER_MIN : CAR_METERS_PER_MIN;
  const legs = order.slice(1).map((to, i) => {
    const distance = haversineMeters(points[order[i]], points[to]) * 1.3;
    return { distance, duration: (distance / speed) * 60 };
  });
  return {
    mode,
    order,
    legs,
    distance: legs.reduce((s, l) => s + l.distance, 0),
    duration: legs.reduce((s, l) => s + l.duration, 0),
    geometry: order.map((i) => [points[i].lat, points[i].lng]),
    estimated: true,
  };
}

/**
 * 道に沿ったルート。行き先が 2 か所以上なら、巡る順番も最適化する。
 * 道案内サーバーにつながらないときは、直線の概算に切り替える。
 */
export async function planRoute(points: LatLng[], mode: RouteMode): Promise<RouteResult> {
  try {
    let order = points.map((_, i) => i);
    if (points.length > 2) {
      // 出発地から始まる周回ルートで順番を決め、戻りの区間は使わない
      const trip = await osrm(mode, "trip", points, "source=first&roundtrip=true&overview=false");
      const pos = (trip.waypoints as { waypoint_index: number }[]).map((w) => w.waypoint_index);
      order = order.sort((a, b) => pos[a] - pos[b]);
    }
    const ordered = order.map((i) => points[i]);
    const route = await osrm(mode, "route", ordered, "overview=full&geometries=geojson");
    const r = route.routes[0];
    return {
      mode,
      order,
      legs: (r.legs as { distance: number; duration: number }[]).map((l) => ({ distance: l.distance, duration: l.duration })),
      distance: r.distance,
      duration: r.duration,
      geometry: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
      estimated: false,
    };
  } catch {
    return estimateRoute(points, mode);
  }
}
