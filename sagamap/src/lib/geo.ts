import { WALK_METERS_PER_MIN } from "./config";

export type LatLng = { lat: number; lng: number };

/** 2 点間の大円距離（メートル） */
export function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 直線距離からの概算徒歩分数（Distance Matrix が使えない場合のフォールバック） */
export function estimateWalkMinutes(meters: number) {
  return Math.max(1, Math.round((meters * 1.25) / WALK_METERS_PER_MIN));
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

export function parseLatLng(searchParams: URLSearchParams): LatLng | null {
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!searchParams.has("lat") || !searchParams.has("lng")) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
