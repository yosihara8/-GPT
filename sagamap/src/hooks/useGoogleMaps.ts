"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useState } from "react";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Google Maps の API キーは「AIza」で始まる 39 文字。それ以外は未設定として扱う */
export const hasGoogleMapsKey = /^AIza[0-9A-Za-z_-]{35}$/.test(apiKey);

let loading: Promise<typeof google> | null = null;
let failure: string | null = hasGoogleMapsKey ? null : "Google Maps の API キーが設定されていません";
const listeners = new Set<(message: string) => void>();

function fail(message: string) {
  failure = message;
  listeners.forEach((fn) => fn(message));
}

/** Google Maps JavaScript API を 1 度だけ読み込む。キーの認証失敗も error として返す */
export function useGoogleMaps() {
  const [ready, setReady] = useState(typeof window !== "undefined" && Boolean(window.google?.maps) && !failure);
  const [error, setError] = useState<string | null>(failure);

  useEffect(() => {
    listeners.add(setError);
    if (failure || ready) return () => void listeners.delete(setError);

    // キーの制限・請求設定などで認証に失敗すると Google から呼ばれる
    (window as unknown as { gm_authFailure: () => void }).gm_authFailure = () =>
      fail("Google Maps の API キーの認証に失敗しました");
    loading ??= new Loader({
      apiKey,
      version: "weekly",
      language: "ja",
      region: "JP",
      libraries: ["visualization", "geometry"],
    }).load();
    loading.then(() => setReady(true)).catch((e: Error) => fail(e.message));
    return () => void listeners.delete(setError);
  }, [ready]);

  return { ready: ready && !error, error };
}
