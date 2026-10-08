"use client";

import { useCallback, useEffect, useState } from "react";
import { SAGA_CENTER } from "@/lib/config";

export type Position = { lat: number; lng: number };

/** GPS 現在地。取得できない場合は佐賀駅を仮の現在地にする */
export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [status, setStatus] = useState<"idle" | "locating" | "ok" | "denied">("idle");

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPosition(SAGA_CENTER);
      setIsFallback(true);
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setIsFallback(false);
        setStatus("ok");
      },
      () => {
        setPosition(SAGA_CENTER);
        setIsFallback(true);
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  useEffect(locate, [locate]);
  return { position, isFallback, status, locate };
}
