import type { LatLng } from "./geo";

export type GeocodeResult = LatLng & { matched: string };

/** 全角英数字・記号を半角に、空白を除去（住所検索の精度を上げるため） */
export function normalizeAddress(address: string) {
  return address
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[‐－―ー−](?=\d)/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

const inJapan = (p: LatLng) => p.lat > 20 && p.lat < 46 && p.lng > 122 && p.lng < 154;

/** 国土地理院の住所検索（無料・キー不要） */
async function geocodeGsi(address: string): Promise<GeocodeResult | null> {
  const url = new URL("https://msearch.gsi.go.jp/address-search/AddressSearch");
  url.searchParams.set("q", address);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { geometry?: { coordinates?: [number, number] }; properties?: { title?: string } }[];
  const hit = Array.isArray(data) ? data[0] : null;
  const c = hit?.geometry?.coordinates;
  if (!c) return null;
  const p = { lat: Number(c[1]), lng: Number(c[0]) };
  return inJapan(p) ? { ...p, matched: hit?.properties?.title ?? address } : null;
}

/** Google Geocoding API（GOOGLE_MAPS_SERVER_KEY がある場合のみ） */
async function geocodeGoogle(address: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("region", "jp");
  url.searchParams.set("language", "ja");
  url.searchParams.set("key", key);
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const r = data?.results?.[0];
  const loc = r?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng, matched: r.formatted_address ?? address } : null;
}

/** 住所 → 緯度経度。見つからなければ null */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = normalizeAddress(address);
  if (!q) return null;
  for (const fn of [geocodeGsi, geocodeGoogle]) {
    try {
      const r = await fn(q);
      if (r) return r;
    } catch {
      /* 次の方法を試す */
    }
  }
  return null;
}

export const ADDRESS_NOT_FOUND = "住所から場所を見つけられませんでした。都道府県から番地まで、正しく入力し直してください（例：佐賀県佐賀市駅前中央1丁目4-17）";
