import { describe, expect, it } from "vitest";
import { dayHours, scheduleStatus, summarizeWeekly, weeklyFromText, type Weekly } from "@/lib/schedule";
import { shopStatus } from "@/lib/open-status";

// 2026-10-14 は水曜日。JST 12:00 = UTC 03:00
const at = (ymd: string, hhmm: string) => new Date(`${ymd}T${hhmm}:00+09:00`);
const lunchDinner: Weekly = [
  [["11:00", "20:00"]], // 日
  [["11:00", "14:00"], ["17:00", "22:00"]], // 月
  [["11:00", "14:00"], ["17:00", "22:00"]],
  [], // 水 定休
  [["11:00", "14:00"], ["17:00", "22:00"]],
  [["18:00", "02:00"]], // 金 深夜
  [["11:00", "20:00"]],
];

describe("営業カレンダー", () => {
  it("定休日", () => {
    expect(scheduleStatus(lunchDinner, [], at("2026-10-14", "12:00"))).toEqual({ label: "本日定休日", open: false });
  });
  it("2 部制の昼休み", () => {
    expect(scheduleStatus(lunchDinner, [], at("2026-10-15", "15:00"))?.label).toBe("営業時間外（17:00から）");
    expect(scheduleStatus(lunchDinner, [], at("2026-10-15", "18:00"))?.open).toBe(true);
    expect(scheduleStatus(lunchDinner, [], at("2026-10-15", "23:00"))?.label).toBe("本日の営業は終了");
  });
  it("深夜営業は翌日の未明まで営業中", () => {
    expect(scheduleStatus(lunchDinner, [], at("2026-10-17", "01:30"))?.label).toBe("まもなく閉店（02:00まで）");
    expect(scheduleStatus(lunchDinner, [], at("2026-10-16", "23:00"))?.open).toBe(true);
  });
  it("臨時休業と特別営業が曜日より優先", () => {
    const sp = [
      { day: "2026-10-15", closed: true, ranges: null, note: "改装" },
      { day: "2026-10-14", closed: false, ranges: [["10:00", "15:00"]] as [string, string][], note: "" },
    ];
    expect(scheduleStatus(lunchDinner, sp, at("2026-10-15", "12:00"))?.label).toBe("本日臨時休業");
    expect(scheduleStatus(lunchDinner, sp, at("2026-10-14", "12:00"))?.open).toBe(true);
    expect(dayHours("2026-10-15", lunchDinner, sp)).toMatchObject({ closed: true, special: true, note: "改装" });
  });
  it("文字にまとめる", () => {
    const s = summarizeWeekly(lunchDinner);
    expect(s.closed).toBe("水曜");
    expect(s.hours).toContain("月・火 11:00〜14:00 / 17:00〜22:00");
  });
  it("以前の自由入力から作る", () => {
    const w = weeklyFromText("9:30〜18:00", "水曜日");
    expect(w[3]).toEqual([]);
    expect(w[1]).toEqual([["09:30", "18:00"]]);
  });
  it("カレンダーがなければ自由入力で判断（臨時休業は反映）", () => {
    const shop = { business_hours: "11:00〜20:00", closed_days: "", special_days: [{ day: "2026-10-15", closed: true, ranges: null, note: "" }] };
    expect(shopStatus(shop, at("2026-10-15", "12:00"))?.label).toBe("本日臨時休業");
    expect(shopStatus(shop, at("2026-10-16", "12:00"))?.open).toBe(true);
  });
});
