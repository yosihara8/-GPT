"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAGA_CENTER } from "@/lib/config";

export type Position = { lat: number; lng: number };

/** これより誤差が小さくなったら測位を終える（m） */
const GOOD_ACCURACY_M = 25;
/** 精度を上げるために測位を続ける最長時間 */
const WATCH_MS = 20000;

/**
 * GPS 現在地。
 * 取得直後は Wi-Fi や基地局による大まかな位置のことが多いため、
 * しばらく測位を続け、誤差（accuracy）が最も小さい位置を採用する。
 * 取得できない場合は佐賀駅を仮の現在地にする。
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [status, setStatus] = useState<"idle" | "locating" | "ok" | "denied">("idle");
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const best = useRef<number>(Infinity);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (timer.current) clearTimeout(timer.current);
    watchId.current = null;
    timer.current = null;
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPosition(SAGA_CENTER);
      setIsFallback(true);
      setStatus("denied");
      return;
    }
    stop();
    best.current = Infinity;
    setStatus("locating");
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy;
        // 前回より精度が良いときだけ更新（ピンが大きく飛ばないように）
        if (acc <= best.current) {
          best.current = acc;
          setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
          setAccuracy(Math.round(acc));
          setIsFallback(false);
          setStatus("ok");
        }
        if (acc <= GOOD_ACCURACY_M) stop();
      },
      () => {
        stop();
        if (best.current === Infinity) {
          setPosition(SAGA_CENTER);
          setIsFallback(true);
          setStatus("denied");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    timer.current = setTimeout(stop, WATCH_MS);
  }, [stop]);

  useEffect(() => {
    locate();
    return stop;
  }, [locate, stop]);

  return { position, accuracy, isFallback, status, locate };
}
