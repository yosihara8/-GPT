import { describe, expect, it } from "vitest";
import { FLOW_AREAS, jstHour, nearestArea, roundCoord } from "@/lib/flows";

describe("nearestArea", () => {
  it("近いエリア名を返す", () => {
    expect(nearestArea(33.2645, 130.2972)).toBe("佐賀駅周辺");
    expect(nearestArea(FLOW_AREAS[3].lat, FLOW_AREAS[3].lng)).toBe(FLOW_AREAS[3].name);
  });
  it("10km より遠ければ「その他の地域」", () => {
    expect(nearestArea(35.68, 139.76)).toBe("その他の地域");
  });
});

describe("roundCoord / jstHour", () => {
  it("約 100m 単位に丸める（正確な位置を残さない）", () => {
    expect(roundCoord(33.264349)).toBe(33.264);
    expect(roundCoord(130.29751)).toBe(130.298);
  });
  it("UTC 15 時は日本時間 0 時", () => {
    expect(jstHour(new Date("2026-01-01T15:00:00Z"))).toBe(0);
  });
});
