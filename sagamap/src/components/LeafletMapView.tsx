"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BedDouble, Bus, Landmark, Layers, UtensilsCrossed } from "lucide-react";
import { categoryIcon } from "./CategoryIcon";
import { MapLegend, couponLabel, declutter, hasCoupon, isHighlighted, isListing, type MapViewProps } from "./MapView";
import { COUPON_HIGHLIGHT_RADIUS_M, SAGA_CENTER } from "@/lib/config";
import { formatDistance, type LatLng } from "@/lib/geo";
import { escapeHtml } from "@/lib/escape";
import { useT } from "@/components/LangProvider";
import type { RouteResult } from "@/lib/routing";

/** 道順は OpenStreetMap の道路データ（ODbL）を使うため、ルート表示中は出典を地図に表示する */
const OSM_ATTRIBUTION = '道順 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

const GSI_ATTRIBUTION = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>';

const COLORS = {
  coupon: "#C43D2B",
  shop: "#1E3A6E",
  spot: "#B9832A",
  listing: "#5F7F35",
  me: "#2e90fa",
  route: "#EE6A3A",
};

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
const listingSvg: Record<string, string> = {
  stay: renderToStaticMarkup(<BedDouble size={14} strokeWidth={2.2} color="#fff" aria-hidden />),
  transport: renderToStaticMarkup(<Bus size={14} strokeWidth={2.2} color="#fff" aria-hidden />),
  food: renderToStaticMarkup(<UtensilsCrossed size={14} strokeWidth={2.2} color="#fff" aria-hidden />),
};

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
  onSelectSpot,
  center,
  selectedId,
  className = "h-[62vh]",
  legend = true,
  layerToggle = true,
}: MapViewProps) {
  const t = useT();
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layers = useRef<Record<string, L.LayerGroup>>({});
  const base = useRef<{ map: L.TileLayer; photo: L.TileLayer } | null>(null);
  const [photo, setPhoto] = useState(false);
  const toggleBase = () => {
    const map = mapRef.current;
    if (!map || !base.current) return;
    const next = !photo;
    base.current[next ? "map" : "photo"].remove();
    base.current[next ? "photo" : "map"].addTo(map).bringToBack();
    setPhoto(next);
  };
  const onSelectRef = useRef(onSelectShop);
  onSelectRef.current = onSelectShop;
  const onSpotRef = useRef(onSelectSpot);
  onSpotRef.current = onSelectSpot;
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
    const map = L.map(divRef.current, { zoomControl: false }).setView(center ?? me ?? SAGA_CENTER, 15);
    L.control.zoom({ position: "topright" }).addTo(map);
    // 国土地理院の標準地図（カラー・日本語表記・商用利用可）。色はそのまま表示する
    base.current = {
      map: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
        maxZoom: 19,
        maxNativeZoom: 18,
        attribution: GSI_ATTRIBUTION,
      }),
      photo: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", {
        maxZoom: 19,
        maxNativeZoom: 18,
        attribution: GSI_ATTRIBUTION,
      }),
    };
    base.current.map.addTo(map);
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
      L.circle(me, {
        radius: meAccuracy,
        stroke: false,
        fillColor: COLORS.me,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(g);
    }
    L.marker(me, {
      icon: L.divIcon({
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: '<div class="sm-me"><span></span></div>',
      }),
      zIndexOffset: 2000,
      keyboard: false,
    })
      .bindTooltip(meAccuracy ? `現在地（誤差 約${meAccuracy}m）` : "現在地")
      .addTo(g);
    if (!searchRadius) mapRef.current.panTo(me);
  }, [me, meAccuracy, searchRadius]);

  // 店舗ピン（500m 以内のクーポン店舗 = 赤 / 通常 = 青）
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("shops");
    const labels: { shop: (typeof shops)[number]; marker: L.Marker }[] = [];
    for (const shop of shops) {
      const red = isHighlighted(shop, me, highlightRadius);
      const selected = shop.id === selectedId;
      const size = selected ? 42 : red ? 34 : 30;
      // しずく形のピン（先端がお店の場所）
      const tip = Math.round(size * 1.2);
      const icon = L.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, tip],
        tooltipAnchor: [0, -tip + size / 2],
        html: `<div class="sm-drop${selected ? " sm-drop-on" : ""}" style="width:${size}px;height:${size}px;background:${red ? COLORS.coupon : COLORS.shop}">${iconSvg(
          shop.category,
          Math.round(size * 0.5),
        )}</div>`,
      });
      const marker = L.marker(shop, {
        icon,
        zIndexOffset: selected ? 1000 : red ? 500 : 0,
        keyboard: true,
        title: shop.name,
      })
        .on("click", () => onSelectRef.current?.(shop.id))
        .addTo(g);
      // クーポンを配信中のお店は、地図上に「クーポン発行中」を常に表示する（タップでお店とクーポンの内容へ）
      if (hasCoupon(shop)) {
        labels.push({ shop, marker });
        marker.bindTooltip(couponLabel(shop), {
          permanent: true,
          direction: "right",
          offset: [size / 2 - 2, 0],
          className: "sm-coupon-label",
          interactive: true,
        });
        marker.getTooltip()?.on("click", () => onSelectRef.current?.(shop.id));
      } else {
        marker.bindTooltip(escapeHtml(`${shop.name}（${shop.category}）`));
      }
    }
    // 札が重なったら 1 つにまとめる（優先：選択中 → 割引率の大きい順）。地図を動かすたびに計算し直す
    labels.sort(
      (a, b) => Number(b.shop.id === selectedId) - Number(a.shop.id === selectedId) || (b.shop.best_discount ?? 0) - (a.shop.best_discount ?? 0),
    );
    const map = mapRef.current;
    const relabel = () => {
      const boxes = labels.map(({ shop, marker }) => {
        const p = map.latLngToContainerPoint(marker.getLatLng());
        // 札はピンの右に出る
        return { key: shop.id, x: p.x + 40, y: p.y - 22, w: 80, h: 30 };
      });
      const { hidden, extra } = declutter(boxes);
      for (const { shop, marker } of labels) {
        const tip = marker.getTooltip();
        if (!tip) continue;
        const n = extra.get(shop.id) ?? 0;
        tip.setContent(`${couponLabel(shop)}${n ? ` +${n}` : ""}`);
        const el = tip.getElement();
        if (el) el.style.display = hidden.has(shop.id) ? "none" : "";
      }
    };
    map.on("zoomend moveend", relabel);
    const t = setTimeout(relabel, 0);
    return () => {
      clearTimeout(t);
      map.off("zoomend moveend", relabel);
    };
  }, [shops, me, highlightRadius, selectedId]);

  // 選んだお店を地図の中心に
  useEffect(() => {
    const shop = shops.find((s) => s.id === selectedId);
    if (shop) mapRef.current?.panTo(shop, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 観光名所
  useEffect(() => {
    if (!mapRef.current) return;
    const g = layer("spots");
    for (const s of spots) {
      const icon = L.divIcon({
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: isListing(s)
          ? `<div class="sm-pin" style="width:24px;height:24px;border-radius:999px;background:${COLORS.listing}">${listingSvg[s.kind ?? "stay"]}</div>`
          : `<div class="sm-pin" style="width:24px;height:24px;border-radius:8px;background:${COLORS.spot}">${spotSvg}</div>`,
      });
      L.marker(s, { icon, title: s.name })
        .bindTooltip(escapeHtml(s.name))
        .on("click", () => onSpotRef.current?.(s.id))
        .addTo(g);
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
      body: JSON.stringify({
        mode: routeMode,
        points: stops.map(({ lat, lng }) => ({ lat, lng })),
      }),
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
      {legend && <MapLegend />}
      {layerToggle && (
        <button
          type="button"
          onClick={toggleBase}
          aria-pressed={photo}
          className="absolute bottom-6 left-2 z-[500] flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-pop ring-1 ring-slate-200"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          {t(photo ? "地図" : "航空写真")}
        </button>
      )}
    </div>
  );
}
