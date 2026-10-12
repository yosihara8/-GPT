import { describe, expect, it } from "vitest";
import { daysLeft, openStatus } from "../src/lib/open-status";

// 日本時間の日時を作る（テストを動かす場所のタイムゾーンに関係なく）
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("openStatus", () => {
  it("営業時間内は営業中", () => {
    expect(openStatus("11:00〜20:00", "", jst("2026-10-14T12:00:00"))).toEqual({ label: "営業中（20:00まで）", open: true });
  });
  it("営業時間外は開店時刻を出す", () => {
    expect(openStatus("11:00〜20:00", "", jst("2026-10-14T09:00:00"))?.open).toBe(false);
  });
  it("閉店 1 時間前はまもなく閉店", () => {
    expect(openStatus("11:00～20:00", "", jst("2026-10-14T19:30:00"))?.label).toContain("まもなく閉店");
  });
  it("深夜営業に対応", () => {
    expect(openStatus("18:00-2:00", "", jst("2026-10-15T01:00:00"))?.open).toBe(true);
  });
  it("定休日（2026-10-14 は水曜日）", () => {
    expect(openStatus("11:00〜20:00", "水曜日", jst("2026-10-14T12:00:00"))).toEqual({ label: "本日定休日", open: false });
  });
  it("読み取れない書き方は表示しない", () => {
    expect(openStatus("お昼ごろから", "", jst("2026-10-14T12:00:00"))).toBeNull();
  });
});

describe("daysLeft", () => {
  it("7 日以内だけ表示", () => {
    const now = new Date("2026-10-14T00:00:00Z");
    expect(daysLeft("2026-10-17T00:00:00Z", now)).toBe("あと3日");
    expect(daysLeft("2026-11-30T00:00:00Z", now)).toBeNull();
  });
});
