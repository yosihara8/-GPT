import { describe, expect, it } from "vitest";
import { estimateWalkMinutes, formatDistance, haversineMeters, parseLatLng } from "@/lib/geo";

describe("haversineMeters", () => {
  it("佐賀駅〜佐賀城本丸歴史館は約 2km", () => {
    const d = haversineMeters({ lat: 33.2643, lng: 130.297 }, { lat: 33.247, lng: 130.3005 });
    expect(d).toBeGreaterThan(1800);
    expect(d).toBeLessThan(2100);
  });
  it("同じ地点は 0m", () => {
    expect(haversineMeters({ lat: 33, lng: 130 }, { lat: 33, lng: 130 })).toBe(0);
  });
});

describe("estimateWalkMinutes / formatDistance", () => {
  it("800m は徒歩 10〜15 分程度", () => {
    const m = estimateWalkMinutes(800);
    expect(m).toBeGreaterThanOrEqual(10);
    expect(m).toBeLessThanOrEqual(15);
  });
  it("最低 1 分", () => expect(estimateWalkMinutes(0)).toBe(1));
  it("1km 未満は m、以上は km 表記", () => {
    expect(formatDistance(450)).toBe("450m");
    expect(formatDistance(1530)).toBe("1.5km");
  });
});

describe("parseLatLng", () => {
  it("正しい値を読み取る", () => {
    expect(parseLatLng(new URLSearchParams("lat=33.26&lng=130.29"))).toEqual({ lat: 33.26, lng: 130.29 });
  });
  it("範囲外や欠落は null", () => {
    expect(parseLatLng(new URLSearchParams("lat=95&lng=130"))).toBeNull();
    expect(parseLatLng(new URLSearchParams("lat=33"))).toBeNull();
    expect(parseLatLng(new URLSearchParams("lat=abc&lng=130"))).toBeNull();
  });
});
