import type { LatLng } from "./geo";

/** 住所 → 緯度経度（Google Geocoding API）。失敗時は null */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("region", "jp");
  url.searchParams.set("language", "ja");
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}
