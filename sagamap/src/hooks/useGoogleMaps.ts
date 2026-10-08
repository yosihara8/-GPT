"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useState } from "react";

let loading: Promise<typeof google> | null = null;

/** Google Maps JavaScript API を 1 度だけ読み込む */
export function useGoogleMaps() {
  const [ready, setReady] = useState(typeof window !== "undefined" && Boolean(window.google?.maps));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が設定されていません");
      return;
    }
    loading ??= new Loader({
      apiKey,
      version: "weekly",
      language: "ja",
      region: "JP",
      libraries: ["visualization", "geometry"],
    }).load();
    loading.then(() => setReady(true)).catch((e: Error) => setError(e.message));
  }, [ready]);

  return { ready, error };
}
