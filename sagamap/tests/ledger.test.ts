import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(async () => [{ paid: 2, special: 1, expected: 6960 }]),
}));

describe("ledger", () => {
  it("前月の範囲を日本時間で求める", async () => {
    const { previousMonthJst } = await import("@/lib/ledger");
    // 日本時間 2026-10-01 00:10
    const r = previousMonthJst(new Date("2026-09-30T15:10:00Z"));
    expect(r.label).toBe("2026-09");
    expect(r.start.toISOString()).toBe("2026-08-31T15:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-09-30T15:00:00.000Z");
    // 1 月に実行 → 前年 12 月
    expect(previousMonthJst(new Date("2027-01-05T00:00:00Z")).label).toBe("2026-12");
  });

  it("Stripe 未設定でも Excel を作れる", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { buildMonthlyLedger } = await import("@/lib/ledger");
    const r = await buildMonthlyLedger(new Date("2026-10-01T00:00:00Z"));
    expect(r.filename).toBe("sagamap-ledger-2026-09.xlsx");
    expect(r.content.subarray(0, 2).toString()).toBe("PK");
    expect(r.summary.stripeReady).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("ledger（Stripe あり）", () => {
  it("売上・手数料・入金を帳簿の行にする", async () => {
    vi.resetModules();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    const txs = [
      { id: "txn_1", type: "charge", amount: 3980, fee: 143, created: 1756900000, description: null, source: { object: "charge", customer: "cus_1", billing_details: {} } },
      { id: "txn_2", type: "payout", amount: -3837, fee: 0, created: 1757000000, description: null, source: null },
    ];
    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({ balanceTransactions: { list: () => ({ async *[Symbol.asyncIterator]() { yield* txs; } }) } }),
    }));
    const { query } = await import("@/lib/db");
    vi.mocked(query)
      .mockResolvedValueOnce([{ stripe_customer_id: "cus_1", name: "テスト商店", email: "shop@example.jp" }])
      .mockResolvedValueOnce([{ paid: 1, special: 0, expected: 3980 }]);
    const { buildMonthlyLedger } = await import("@/lib/ledger");
    const r = await buildMonthlyLedger(new Date("2026-10-01T00:00:00Z"));
    expect(r.summary).toMatchObject({ sales: 3980, fees: 143, payouts: 1, entries: 2, stripeReady: true });
    vi.unstubAllEnvs();
  });
});
