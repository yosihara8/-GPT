import { describe, expect, it } from "vitest";
import { checkAd, checkCoupon } from "@/lib/content-check";

describe("checkCoupon", () => {
  it("普通のクーポンは問題なし", () => {
    const r = checkCoupon({ title: "ランチ 10% OFF", conditions: "平日のみ", discount_rate: 10 });
    expect(r).toEqual({ blocked: [], warnings: [] });
  });

  it("根拠のない最上級表現は掲載できない", () => {
    expect(checkCoupon({ title: "佐賀一おいしいラーメン", discount_rate: 10 }).blocked).toHaveLength(1);
    expect(checkCoupon({ title: "地域最安値！", discount_rate: 10 }).blocked).toHaveLength(1);
    expect(checkCoupon({ title: "顧客満足度No.1", discount_rate: 10 }).blocked.length).toBeGreaterThan(0);
  });

  it("本文の割引率が登録した割引率より大きいと掲載できない", () => {
    expect(checkCoupon({ title: "全品半額", discount_rate: 10 }).blocked[0]).toContain("50%");
    expect(checkCoupon({ title: "3割引", discount_rate: 30 }).blocked).toEqual([]);
  });

  it("二重価格・期間限定は要確認", () => {
    const r = checkCoupon({ title: "通常価格 1,000 円が今だけ 900 円", discount_rate: 10 });
    expect(r.blocked).toEqual([]);
    expect(r.warnings).toHaveLength(2);
  });
});

describe("checkAd", () => {
  it("効能をうたう広告は掲載できない", () => {
    expect(checkAd({ headline: "肩こりが治るマッサージ" }).blocked).toHaveLength(1);
  });
  it("普通の広告は問題なし", () => {
    expect(checkAd({ headline: "秋の新メニュー登場", body: "栗のパフェはじめました" })).toEqual({ blocked: [], warnings: [] });
  });
});
