"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapLegend, isHighlighted, type MapSpot, type MapViewProps } from "./MapView";
import { COUPON_HIGHLIGHT_RADIUS_M, SAGA_CENTER, WALK_METERS_PER_MIN, categoryEmoji } from "@/lib/config";
import { formatDistance, haversineMeters, type LatLng } from "@/lib/geo";
import { escapeHtml } from "@/lib/escape";

const COLORS = { coupon: "#e5484d", shop: "#3b82f6", spot: "#d97706", me: "#2563eb", route: "#1f8a7a" };

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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
      L.circle(me, { radius: searchRadius, color: COLORS.me, weight: 1, opacity: 0.6, fillOpacity: 0.06, interactive: false }).addTo(g);
    }
    if (meAccuracy && meAccuracy > 15) {
      L.circle(me, { radius: meAccuracy, stroke: false, fillColor: COLORS.me, fillOpacity: 0.12, interactive: false }).addTo(g);
    }
    L.circleMarker(me, { radius: 8, color: "#fff", weight: 3, fillColor: COLORS.me, fillOpacity: 1 })
      .bindTooltip(meAccuracy ? `現在地（誤差 約${meAccuracy}m）` : "現在地")
      .addTo(g);
    mapRef.current.panTo(me);
  }, [me, meAccuracy, searchRadius]);

  // 店舗ピン（500m 以内のクーポン店舗 = 赤 / 通常 = 青）
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("shops");
    for (const shop of shops) {
      const red = isHighlighted(shop, me, highlightRadius);
      const selected = shop.id === selectedId;
      const size = selected ? 46 : red ? 40 : 34;
      const icon = L.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        tooltipAnchor: [0, -size],
        html: `<div class="sm-pin" style="width:${size}px;height:${size}px;background:${red ? COLORS.coupon : COLORS.shop}"><span style="font-size:${Math.round(size * 0.45)}px">${escapeHtml(categoryEmoji(shop.category))}</span></div>`,
      });
      L.marker(shop, { icon, zIndexOffset: selected ? 1000 : red ? 500 : 0, keyboard: true, title: shop.name })
        .bindTooltip(escapeHtml(`${shop.name}（${shop.category}）${red ? " 🎟️クーポンあり" : ""}`))
        .on("click", () => onSelectRef.current?.(shop.id))
        .addTo(g);
    }
  }, [shops, me, highlightRadius, selectedId]);

  // 観光名所
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("spots");
    for (const s of spots) {
      const icon = L.divIcon({
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:9999px;background:${COLORS.spot};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:14px">⭐</div>`,
      });
      L.marker(s, { icon, title: s.name }).bindTooltip(escapeHtml(`⭐ ${s.name}`)).addTo(g);
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

  // 観光名所ルート（近い順に巡る概算ルート）
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("route");
    if (!routeStops?.length) return;
    const origin: LatLng & { name?: string } = me ?? routeStops[0];
    const rest = me ? [...routeStops] : routeStops.slice(1);
    const order: (LatLng & { name?: string })[] = [origin];
    while (rest.length) {
      const last = order[order.length - 1];
      rest.sort((a, b) => haversineMeters(last, a) - haversineMeters(last, b));
      order.push(rest.shift()!);
    }
    if (order.length < 2) return;
    L.polyline(order, { color: COLORS.route, weight: 5, opacity: 0.85, dashArray: "8 6" }).addTo(g);

    // 道のりは直線距離の約 1.25 倍として概算
    const legs = order.slice(1).map((to, i) => {
      const from = order[i];
      const meters = haversineMeters(from, to) * 1.25;
      return { meters, from: i === 0 && me ? "現在地" : (from as MapSpot).name, to: (to as MapSpot).name };
    });
    const totalMeters = legs.reduce((s, l) => s + l.meters, 0);
    const walking = totalMeters < 4000;
    const speed = walking ? WALK_METERS_PER_MIN : 500; // 車は約 30km/h
    onRouteRef.current?.({
      mode: walking ? "WALKING" : "DRIVING",
      totalMeters,
      totalSeconds: (totalMeters / speed) * 60,
      legs: legs.map((l) => ({
        from: l.from,
        to: l.to,
        distance: `約${formatDistance(l.meters)}`,
        duration: `約${Math.max(1, Math.round(l.meters / speed))}分`,
      })),
    });
  }, [routeStops, me]);

  return (
    <div className={`relative ${className}`}>
      <div ref={divRef} className="absolute inset-0 z-0" aria-label="店舗マップ" />
      <MapLegend />
    </div>
  );
}
