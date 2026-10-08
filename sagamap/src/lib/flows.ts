/**
 * 時間帯別の観光客の流れ（ダミーデータ）。
 * 実運用では人流データ（携帯基地局・Wi-Fi・アプリ GPS など）に置き換える。
 */
export type FlowArea = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  spread: number; // 散らばり（度）
  /** 0〜23 時の相対的な人の多さ（0〜1） */
  hourly: number[];
};

const curve = (peaks: [hour: number, height: number, width: number][]) =>
  Array.from({ length: 24 }, (_, h) =>
    Math.min(1, 0.03 + peaks.reduce((s, [p, a, w]) => s + a * Math.exp(-((h - p) ** 2) / (2 * w * w)), 0)),
  );

export const FLOW_AREAS: FlowArea[] = [
  { key: "saga-station", name: "佐賀駅周辺", lat: 33.2643, lng: 130.297, spread: 0.004, hourly: curve([[8, 0.7, 1.2], [12, 0.6, 1.5], [18, 0.9, 1.5]]) },
  { key: "saga-castle", name: "佐賀城・県庁周辺", lat: 33.2482, lng: 130.2995, spread: 0.004, hourly: curve([[11, 0.8, 2], [15, 0.7, 1.8]]) },
  { key: "tojin", name: "唐人町・呉服元町", lat: 33.2575, lng: 130.302, spread: 0.003, hourly: curve([[13, 0.6, 2], [19, 0.5, 1.5]]) },
  { key: "ureshino", name: "嬉野温泉", lat: 33.1013, lng: 129.9965, spread: 0.005, hourly: curve([[10, 0.5, 2], [17, 0.9, 2], [21, 0.6, 1.5]]) },
  { key: "arita", name: "有田", lat: 33.1906, lng: 129.8806, spread: 0.005, hourly: curve([[11, 0.8, 1.8], [14, 0.6, 1.5]]) },
  { key: "karatsu", name: "唐津・呼子", lat: 33.47, lng: 129.95, spread: 0.02, hourly: curve([[9, 0.6, 1.5], [12, 0.9, 1.5], [16, 0.5, 2]]) },
  { key: "takeo", name: "武雄温泉", lat: 33.1935, lng: 130.0195, spread: 0.004, hourly: curve([[12, 0.6, 2], [18, 0.7, 2]]) },
];

/** 決定的な疑似乱数（毎回同じダミーデータを返すため） */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WeightedPoint = { lat: number; lng: number; weight: number };

export function touristFlowPoints(hour: number): WeightedPoint[] {
  const points: WeightedPoint[] = [];
  FLOW_AREAS.forEach((area, ai) => {
    const rand = mulberry32(ai * 100 + hour);
    const intensity = area.hourly[hour];
    const n = Math.round(10 + intensity * 50);
    for (let i = 0; i < n; i++) {
      // Box-Muller で中心付近に集める
      const r = Math.sqrt(-2 * Math.log(rand() || 1e-9)) * area.spread;
      const t = 2 * Math.PI * rand();
      points.push({ lat: area.lat + r * Math.sin(t), lng: area.lng + r * Math.cos(t), weight: intensity });
    }
  });
  return points;
}

/** 店舗位置に最も近いエリアの、その時間帯の混雑係数（0〜1） */
export function crowdFactorAt(lat: number, lng: number, hour: number) {
  let best = FLOW_AREAS[0];
  let bestD = Infinity;
  for (const a of FLOW_AREAS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best.hourly[hour];
}

export function jstHour(date = new Date()) {
  return (date.getUTCHours() + 9) % 24;
}
