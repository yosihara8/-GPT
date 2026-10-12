import { describe, expect, it } from "vitest";
import { eventPeriod, eventStatus } from "@/lib/events";

const ev = { starts_on: "2026-10-29", ends_on: "2026-11-03" };
const at = (ymd: string) => new Date(`${ymd}T12:00:00+09:00`);

describe("イベントの状態", () => {
  it("開催前・開催中・終了", () => {
    expect(eventStatus(ev, at("2026-10-12")).label).toBe("あと17日で開催");
    expect(eventStatus(ev, at("2026-10-28")).label).toBe("あすから開催");
    expect(eventStatus(ev, at("2026-10-29"))).toMatchObject({ live: true, label: "開催中・あと6日" });
    expect(eventStatus(ev, at("2026-11-03")).label).toBe("開催中・本日まで");
    expect(eventStatus(ev, at("2026-11-04")).ended).toBe(true);
  });
  it("期間の表示", () => {
    expect(eventPeriod(ev)).toBe("10/29〜11/3");
  });
});

import { monthLabel, prevMonth } from "@/lib/owner-report-shared";
describe("月次レポートの月", () => {
  it("前の月・表示", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(prevMonth("2026-10")).toBe("2026-09");
    expect(monthLabel("2026-09")).toBe("2026年9月");
  });
});
