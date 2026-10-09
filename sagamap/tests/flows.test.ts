import { describe, expect, it } from "vitest";
import { FLOW_AREAS, crowdFactorAt, jstHour, touristFlowPoints } from "@/lib/flows";

describe("touristFlowPoints", () => {
  it("同じ時間帯なら毎回同じ点を返す（ダミーデータの再現性）", () => {
    expect(touristFlowPoints(12)).toEqual(touristFlowPoints(12));
  });
  it("重みは 0〜1", () => {
    for (const p of touristFlowPoints(18)) {
      expect(p.weight).toBeGreaterThanOrEqual(0);
      expect(p.weight).toBeLessThanOrEqual(1);
    }
  });
});

describe("crowdFactorAt / jstHour", () => {
  it("最寄りエリアの値を返す", () => {
    const area = FLOW_AREAS[0];
    expect(crowdFactorAt(area.lat, area.lng, 8)).toBe(area.hourly[8]);
  });
  it("UTC 15 時は日本時間 0 時", () => {
    expect(jstHour(new Date("2026-01-01T15:00:00Z"))).toBe(0);
  });
});
