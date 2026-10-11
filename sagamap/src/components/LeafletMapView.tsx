"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Landmark } from "lucide-react";
import { categoryIcon } from "./CategoryIcon";
import { MapLegend, hasCoupon, isHighlighted, type MapViewProps } from "./MapView";
import { COUPON_HIGHLIGHT_RADIUS_M, SAGA_CENTER } from "@/lib/config";
import { formatDistance, type LatLng } from "@/lib/geo";
import { escapeHtml } from "@/lib/escape";
import type { RouteResult } from "@/lib/routing";

/** 道順は OpenStreetMap の道路データ（ODbL）を使うため、ルート表示中は出典を地図に表示する */
const OSM_ATTRIBUTION =
  '道順 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

const COLORS = { coupon: "#d92d20", shop: "#1f4d3f", spot: "#b54708", me: "#2e90fa", route: "#1f4d3f" };

/** アイコンの SVG 文字列（業種ごとに 1 回だけ作る） */
const iconSvgCache = new Map<string, string>();
function iconSvg(category: string, size: number) {
  const key = `${category}:${size}`;
  if (!iconSvgCache.has(key)) {
    const Icon = categoryIcon(category);
    iconSvgCache.set(key, renderToStaticMarkup(<Icon size={size} strokeWidth={2.2} color="#fff" aria-hidden />));
  }
  return iconSvgCache.get(key)!;
}
const spotSvg = renderToStaticMarkup(<Landmark size={14} strokeWidth={2.2} color="#fff" aria-hidden />);

/**
 * Google Maps の API キーが無いときの代替地図（OpenStreetMap + Leaflet）。
 * ルートは Directions API の代わりに「近い順に巡る」直線ルートで概算する。
 */
export default function LeafletMapView({
  shops,
  me,
  meAccuracy,
  highlightRadius = COUPON_HIGHLIGHT_RADIUS_M,
  searchRadius,
  spots = [],
  heatmap,
  routeStops,
  routeMode = "foot",
  onRoute,
  onSelectShop,
  selectedId,
  className = "h-[62vh]",
}: MapViewProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layers = useRef<Record<string, L.LayerGroup>>({});
  const onSelectRef = useRef(onSelectShop);
  onSelectRef.current = onSelectShop;
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;

  const layer = (name: string) => {
    const map = mapRef.current!;
    layers.current[name] ??= L.layerGroup().addTo(map);
    return layers.current[name].clearLayers();
  };

  // 地図の初期化
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: false }).setView(me ?? SAGA_CENTER, 15);
    L.control.zoom({ position: "topright" }).addTo(map);
    // 国土地理院の標準地図（日本語表記・はっきりした配色・商用利用可）
    L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 現在地 + 検索範囲の円
  useEffect(() => {
    if (!mapRef.current || !me) return;
    const g = layer("me");
    if (searchRadius) {
      const circle = L.circle(me, {
        radius: searchRadius,
        color: COLORS.shop,
        weight: 1.5,
        opacity: 0.5,
        fillColor: COLORS.shop,
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(g);
      // 選んだ範囲が画面に収まるように表示を合わせる
      mapRef.current.fitBounds(circle.getBounds(), { padding: [16, 16] });
    }
    if (meAccuracy && meAccuracy > 15) {
      L.circle(me, { radius: meAccuracy, stroke: false, fillColor: COLORS.me, fillOpacity: 0.12, interactive: false }).addTo(g);
    }
    L.circleMarker(me, { radius: 8, color: "#fff", weight: 3, fillColor: COLORS.me, fillOpacity: 1 })
      .bindTooltip(meAccuracy ? `現在地（誤差 約${meAccuracy}m）` : "現在地")
      .addTo(g);
    if (!searchRadius) mapRef.current.panTo(me);
  }, [me, meAccuracy, searchRadius]);

  // 店舗ピン（500m 以内のクーポン店舗 = 赤 / 通常 = 青）
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("shops");
    for (const shop of shops) {
      const red = isHighlighted(shop, me, highlightRadius);
      const selected = shop.id === selectedId;
      const size = selected ? 40 : red ? 34 : 30;
      const icon = L.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        tooltipAnchor: [0, -size / 2],
        html: `<div class="sm-pin" style="width:${size}px;height:${size}px;background:${red ? COLORS.coupon : COLORS.shop}${selected ? ";box-shadow:0 0 0 4px rgba(31,77,63,.25),0 4px 10px rgba(16,24,40,.2)" : ""}">${iconSvg(shop.category, Math.round(size * 0.48))}</div>`,
      });
      const marker = L.marker(shop, { icon, zIndexOffset: selected ? 1000 : red ? 500 : 0, keyboard: true, title: shop.name })
        .on("click", () => onSelectRef.current?.(shop.id))
        .addTo(g);
      // クーポンを配信中のお店は、地図上に「クーポン発行中」を常に表示する（タップでお店とクーポンの内容へ）
      if (hasCoupon(shop)) {
        marker.bindTooltip("クーポン発行中", {
          permanent: true,
          direction: "bottom",
          offset: [0, size / 2 - 2],
          className: "sm-coupon-label",
          interactive: true,
        });
        marker.getTooltip()?.on("click", () => onSelectRef.current?.(shop.id));
      } else {
        marker.bindTooltip(escapeHtml(`${shop.name}（${shop.category}）`));
      }
    }
  }, [shops, me, highlightRadius, selectedId]);

  // 観光名所
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("spots");
    for (const s of spots) {
      const icon = L.divIcon({
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `<div class="sm-pin" style="width:26px;height:26px;border-radius:7px;background:${COLORS.spot}">${spotSvg}</div>`,
      });
      L.marker(s, { icon, title: s.name }).bindTooltip(escapeHtml(s.name)).addTo(g);
    }
  }, [spots]);

  // ヒートマップ（重みに応じた半透明の円）
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("heat");
    for (const p of heatmap ?? []) {
      L.circle(p, {
        radius: 120 + 80 * p.weight,
        stroke: false,
        fillColor: "#ef4444",
        fillOpacity: 0.08 + 0.12 * Math.min(1, p.weight),
        interactive: false,
      }).addTo(g);
    }
  }, [heatmap]);

  // ルート（道に沿った道順。巡る順番も自動で最適化）
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("route");
    if (!routeStops?.length) return;
    const stops: (LatLng & { name: string })[] = me ? [{ ...me, name: "現在地" }, ...routeStops] : [...routeStops];
    if (stops.length < 2) return;
    let cancelled = false;
    let attributed = false;

    fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: routeMode, points: stops.map(({ lat, lng }) => ({ lat, lng })) }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "ルートを取得できませんでした");
        return data as RouteResult;
      })
      .then((r) => {
        if (cancelled || !mapRef.current) return;
        if (!r.estimated) {
          mapRef.current.attributionControl.addAttribution(OSM_ATTRIBUTION);
          attributed = true;
        }
        const line = L.polyline(r.geometry, {
          color: COLORS.route,
          weight: 6,
          opacity: 0.9,
          dashArray: r.estimated ? "8 8" : undefined,
        }).addTo(g);
        // 立ち寄る順番の番号
        r.order.slice(1).forEach((idx, n) => {
          L.marker(stops[idx], {
            icon: L.divIcon({
              className: "",
              iconSize: [24, 24],
              iconAnchor: [12, 34],
              html: `<div style="width:24px;height:24px;border-radius:9999px;background:#101828;color:#fff;font-weight:600;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(16,24,40,.25)">${n + 1}</div>`,
            }),
            interactive: false,
          }).addTo(g);
        });
        mapRef.current.fitBounds(line.getBounds(), { padding: [30, 30] });
        const walking = r.mode === "foot";
        onRouteRef.current?.({
          mode: walking ? "WALKING" : "DRIVING",
          estimated: r.estimated,
          provider: r.estimated ? undefined : "osm",
          totalMeters: r.distance,
          totalSeconds: r.duration,
          legs: r.legs.map((l, n) => ({
            from: stops[r.order[n]].name,
            to: stops[r.order[n + 1]].name,
            distance: `${r.estimated ? "約" : ""}${formatDistance(l.distance)}`,
            duration: `${r.estimated ? "約" : ""}${Math.max(1, Math.round(l.duration / 60))}分`,
          })),
        });
      })
      .catch((e: Error) => !cancelled && onRouteRef.current?.(null, e.message));
    return () => {
      cancelled = true;
      if (attributed) mapRef.current?.attributionControl.removeAttribution(OSM_ATTRIBUTION);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops, routeMode]);

  return (
    <div className={`relative ${className}`}>
      <div ref={divRef} className="absolute inset-0 z-0" aria-label="店舗マップ" />
      <MapLegend />
    </div>
  );
}
