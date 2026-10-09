import { query } from "./db";
import { haversineMeters } from "./geo";

/**
 * 時間帯別の人の流れ（実測）。
 * SagaMap の利用者が地図を開いた場所と時刻を、匿名・約 100m 単位で記録したもの（location_pings）を集計する。
 */

/** 集計の期間（日） */
export const FLOW_DAYS = 30;
/** これより少ないと「データ収集中」として扱う件数 */
export const MIN_SAMPLES = 30;

/** エリア名（集計結果をまとめる単位） */
export const FLOW_AREAS = [
  { key: "saga-station", name: "佐賀駅周辺", lat: 33.2643, lng: 130.297 },
  { key: "saga-castle", name: "佐賀城・県庁周辺", lat: 33.2482, lng: 130.2995 },
  { key: "tojin", name: "唐人町・呉服元町", lat: 33.2575, lng: 130.302 },
  { key: "ureshino", name: "嬉野温泉", lat: 33.1013, lng: 129.9965 },
  { key: "arita", name: "有田", lat: 33.1906, lng: 129.8806 },
  { key: "karatsu", name: "唐津・呼子", lat: 33.47, lng: 129.95 },
  { key: "takeo", name: "武雄温泉", lat: 33.1935, lng: 130.0195 },
  { key: "kashima", name: "鹿島・祐徳稲荷", lat: 33.08, lng: 130.09 },
  { key: "ogi", name: "小城", lat: 33.283, lng: 130.2 },
];

/** 一番近いエリア（10km 以内。なければ「その他の地域」） */
export function nearestArea(lat: number, lng: number) {
  let best: (typeof FLOW_AREAS)[number] | null = null;
  let bestD = Infinity;
  for (const a of FLOW_AREAS) {
    const d = haversineMeters({ lat, lng }, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return bestD <= 10000 && best ? best.name : "その他の地域";
}

export function jstHour(date = new Date()) {
  return (date.getUTCHours() + 9) % 24;
}

/** 約 100m 単位に丸める（個人の正確な位置を残さないため） */
export const roundCoord = (v: number) => Math.round(v * 1000) / 1000;

export async function recordLocationPing(lat: number, lng: number) {
  if (!(lat > 20 && lat < 46 && lng > 122 && lng < 154)) return;
  await query("INSERT INTO location_pings (lat, lng) VALUES ($1, $2)", [roundCoord(lat), roundCoord(lng)]);
  // 古い記録は 180 日で削除
  if (Math.random() < 0.01) await query("DELETE FROM location_pings WHERE created_at < now() - interval '180 days'");
}

const HOUR_JST = "EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo')::int";

/** 指定した時間帯のヒートマップ用の点（直近 30 日） */
export async function flowPoints(hour: number) {
  const rows = await query<{ lat: number; lng: number; n: number }>(
    `SELECT lat, lng, count(*)::int AS n FROM location_pings
      WHERE created_at > now() - make_interval(days => $1) AND ${HOUR_JST} = $2
      GROUP BY lat, lng`,
    [FLOW_DAYS, hour],
  );
  const max = Math.max(1, ...rows.map((r) => r.n));
  return rows.map((r) => ({ lat: r.lat, lng: r.lng, weight: r.n / max, count: r.n }));
}

/** 地点の周辺（半径 m）の時間帯別の件数（0〜23 時） */
export async function hourlyCountsNear(lat: number, lng: number, radiusM: number) {
  const rows = await query<{ h: number; n: number }>(
    `SELECT ${HOUR_JST} AS h, count(*)::int AS n FROM location_pings
      WHERE created_at > now() - make_interval(days => $1)
        AND ST_DWithin(ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4)
      GROUP BY 1`,
    [FLOW_DAYS, lat, lng, radiusM],
  );
  const counts = Array(24).fill(0) as number[];
  for (const r of rows) counts[r.h] = r.n;
  return counts;
}

/** 時間帯ごとに人が多いエリア上位 3 件 */
export async function areaRankingByHour() {
  const rows = await query<{ lat: number; lng: number; h: number; n: number }>(
    `SELECT lat, lng, ${HOUR_JST} AS h, count(*)::int AS n FROM location_pings
      WHERE created_at > now() - make_interval(days => $1) GROUP BY 1, 2, 3`,
    [FLOW_DAYS],
  );
  const byHour: Map<string, number>[] = Array.from({ length: 24 }, () => new Map());
  for (const r of rows) {
    const area = nearestArea(r.lat, r.lng);
    byHour[r.h].set(area, (byHour[r.h].get(area) ?? 0) + r.n);
  }
  return byHour.map((m) =>
    [...m.entries()]
      .map(([area, value]) => ({ area, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3),
  );
}
