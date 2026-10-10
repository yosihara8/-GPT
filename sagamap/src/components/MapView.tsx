"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { hasGoogleMapsKey, useGoogleMaps } from "@/hooks/useGoogleMaps";
import { haversineMeters } from "@/lib/geo";
import { SAGA_CENTER, COUPON_HIGHLIGHT_RADIUS_M } from "@/lib/config";

export type MapShop = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  has_coupon?: boolean;
  best_discount?: number | null;
};

export type MapSpot = { id: number; name: string; lat: number; lng: number };
export type HeatPoint = { lat: number; lng: number; weight: number };

export type RouteLeg = { from: string; to: string; distance: string; duration: string };
export type RouteSummary = {
  legs: RouteLeg[];
  totalMeters: number;
  totalSeconds: number;
  mode: "WALKING" | "DRIVING";
  /** 道順が取れず直線で概算した場合 true */
  estimated?: boolean;
  /** 道順データの提供元（OpenStreetMap のときは出典表示が必要） */
  provider?: "osm" | "google";
};

export type MapViewProps = {
  shops: MapShop[];
  me?: { lat: number; lng: number } | null;
  /** 現在地の誤差（m）。地図に薄い円で表示する */
  meAccuracy?: number | null;
  /** 赤ピンにする範囲（m）。既定 500m */
  highlightRadius?: number;
  /** 検索範囲の円（m）。徒歩 10 分 = 800m など */
  searchRadius?: number | null;
  spots?: MapSpot[];
  heatmap?: HeatPoint[] | null;
  /** 観光名所を巡るルート（選択順。Directions API で最適化） */
  routeStops?: MapSpot[] | null;
  /** ルートの移動手段（OpenStreetMap 地図のとき） */
  routeMode?: "foot" | "car";
  onRoute?: (summary: RouteSummary | null, error?: string) => void;
  onSelectShop?: (id: number) => void;
  selectedId?: number | null;
  className?: string;
};

const COLORS = { coupon: "#e5484d", shop: "#3b82f6", spot: "#d97706", me: "#111827" };

function pinIcon(color: string, scale = 1): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 40 14 40s14-15.7 14-26.1C28 6.2 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="#fff"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(28 * scale, 40 * scale),
    anchor: new google.maps.Point(14 * scale, 40 * scale),
  };
}

export function isHighlighted(shop: MapShop, me: { lat: number; lng: number } | null | undefined, radius: number) {
  const hasCoupon = shop.has_coupon || (shop.best_discount ?? 0) > 0;
  return Boolean(me && hasCoupon && haversineMeters(me, shop) <= radius);
}

function GoogleMapView({
  shops,
  me,
  highlightRadius = COUPON_HIGHLIGHT_RADIUS_M,
  searchRadius,
  spots = [],
  heatmap,
  routeStops,
  onRoute,
  onSelectShop,
  selectedId,
  className = "h-[62vh]",
}: MapViewProps) {
  const { ready, error } = useGoogleMaps();
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const shopMarkers = useRef<google.maps.Marker[]>([]);
  const spotMarkers = useRef<google.maps.Marker[]>([]);
  const meMarker = useRef<google.maps.Marker | null>(null);
  const circle = useRef<google.maps.Circle | null>(null);
  const heatLayer = useRef<google.maps.visualization.HeatmapLayer | google.maps.Circle[] | null>(null);
  const routeRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;
  const onSelectRef = useRef(onSelectShop);
  onSelectRef.current = onSelectShop;

  // 地図の初期化
  useEffect(() => {
    if (!ready || !divRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(divRef.current, {
      center: me ?? SAGA_CENTER,
      zoom: 15,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || undefined,
      gestureHandling: "greedy",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
  }, [ready, me]);

  // 現在地 + 検索範囲の円
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !me) return;
    meMarker.current ??= new google.maps.Marker({
      map,
      title: "現在地",
      zIndex: 1000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
    });
    meMarker.current.setPosition(me);
    map.panTo(me);

    circle.current?.setMap(null);
    circle.current = searchRadius
      ? new google.maps.Circle({
          map,
          center: me,
          radius: searchRadius,
          strokeColor: "#2563eb",
          strokeOpacity: 0.6,
          strokeWeight: 1,
          fillColor: "#2563eb",
          fillOpacity: 0.06,
          clickable: false,
        })
      : null;
  }, [ready, me, searchRadius]);

  // 店舗ピン（500m 以内のクーポン店舗 = 赤 / 通常 = 青）
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    shopMarkers.current.forEach((m) => m.setMap(null));
    shopMarkers.current = shops.map((shop) => {
      const red = isHighlighted(shop, me, highlightRadius);
      const selected = shop.id === selectedId;
      const marker = new google.maps.Marker({
        map,
        position: shop,
        title: `${shop.name}（${shop.category}）${red ? " クーポンあり" : ""}`,
        icon: pinIcon(red ? COLORS.coupon : COLORS.shop, selected ? 1.3 : red ? 1.1 : 0.9),
        zIndex: selected ? 999 : red ? 500 : 100,
        animation: red ? google.maps.Animation.DROP : undefined,
      });
      marker.addListener("click", () => onSelectRef.current?.(shop.id));
      return marker;
    });
  }, [ready, shops, me, highlightRadius, selectedId]);

  // 観光名所
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    spotMarkers.current.forEach((m) => m.setMap(null));
    spotMarkers.current = spots.map(
      (s) =>
        new google.maps.Marker({
          map,
          position: s,
          title: s.name,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: COLORS.spot,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 1.5,
          },
        }),
    );
  }, [ready, spots]);

  // ヒートマップ（Heatmap Layer。使えない環境では円で代替表示）
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const prev = heatLayer.current;
    if (Array.isArray(prev)) prev.forEach((c) => c.setMap(null));
    else prev?.setMap(null);
    heatLayer.current = null;
    if (!heatmap?.length) return;

    if (google.maps.visualization?.HeatmapLayer) {
      heatLayer.current = new google.maps.visualization.HeatmapLayer({
        map,
        radius: 28,
        opacity: 0.7,
        data: heatmap.map((p) => ({ location: new google.maps.LatLng(p.lat, p.lng), weight: p.weight })),
      });
    } else {
      heatLayer.current = heatmap.map(
        (p) =>
          new google.maps.Circle({
            map,
            center: p,
            radius: 120 + 80 * p.weight,
            strokeOpacity: 0,
            fillColor: "#ef4444",
            fillOpacity: 0.08 + 0.12 * Math.min(1, p.weight),
            clickable: false,
          }),
      );
    }
  }, [ready, heatmap]);

  // 観光名所を結ぶ最適ルート（Directions API）
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    routeRenderer.current?.setMap(null);
    routeRenderer.current = null;
    if (!routeStops || routeStops.length === 0) return;

    const origin = me ?? routeStops[0];
    const stops = me ? routeStops : routeStops.slice(1);
    if (stops.length === 0) return;
    const destination = stops[stops.length - 1];
    const span = Math.max(...stops.map((s) => haversineMeters(origin, s)));
    const mode = span < 3000 ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING;

    new google.maps.DirectionsService().route(
      {
        origin,
        destination,
        waypoints: stops.slice(0, -1).map((s) => ({ location: s, stopover: true })),
        optimizeWaypoints: true,
        travelMode: mode,
      },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result) {
          onRouteRef.current?.(null, `ルートを取得できませんでした（${status}）`);
          return;
        }
        routeRenderer.current = new google.maps.DirectionsRenderer({
          map,
          directions: result,
          suppressMarkers: true,
          polylineOptions: { strokeColor: "#1f8a7a", strokeWeight: 5, strokeOpacity: 0.85 },
        });
        const route = result.routes[0];
        const order = [origin, ...route.waypoint_order.map((i) => stops[i]), destination];
        const name = (p: unknown) => (p === me ? "現在地" : (p as MapSpot).name);
        onRouteRef.current?.({
          mode: mode === google.maps.TravelMode.WALKING ? "WALKING" : "DRIVING",
          provider: "google",
          totalMeters: route.legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0),
          totalSeconds: route.legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0),
          legs: route.legs.map((l, i) => ({
            from: name(order[i]),
            to: name(order[i + 1]),
            distance: l.distance?.text ?? "",
            duration: l.duration?.text ?? "",
          })),
        });
      },
    );
  }, [ready, routeStops, me]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-600`}>
        地図を読み込めませんでした：{error}
      </div>
    );
  }
  return (
    <div className={`relative ${className}`}>
      <div ref={divRef} className="absolute inset-0" aria-label="店舗マップ" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-slate-100" />}
      <MapLegend />
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-2xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-pop">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full bg-coupon" />
        500m 以内のクーポン店
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full bg-shop" />
        お店
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full bg-amber-600" />
        観光名所
      </div>
    </div>
  );
}

// Google Maps の API キーが無い・使えない環境では、キー不要の OpenStreetMap（Leaflet）で表示する
const LeafletMapView = dynamic(() => import("./LeafletMapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
});

export default function MapView(props: MapViewProps) {
  const { error } = useGoogleMaps();
  if (!hasGoogleMapsKey || error) return <LeafletMapView {...props} />;
  return <GoogleMapView {...props} />;
}
