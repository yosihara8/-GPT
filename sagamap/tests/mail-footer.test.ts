import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("mailFooter", () => {
  it("設定した住所・送信者名・問い合わせ先・配信停止リンクを表示する", async () => {
    vi.stubEnv("OPERATOR_ADDRESS", "佐賀県佐賀市1-2-3 <テスト>");
    const { mailFooter } = await import("@/lib/mail");
    const html = mailFooter("customer", "https://example.jp/unsubscribe?token=abc");
    expect(html).toContain("JapanAI研修");
    expect(html).toContain("佐賀県佐賀市1-2-3 &lt;テスト&gt;");
    expect(html).toContain("ai.prompt.biz@gmail.com");
    expect(html).toContain("https://example.jp/unsubscribe?token=abc");
  });

  it("住所が未設定なら特定商取引法に基づく表記へ案内する", async () => {
    vi.stubEnv("OPERATOR_ADDRESS", "");
    const { mailFooter } = await import("@/lib/mail");
    expect(mailFooter("customer")).toContain("/tokushoho");
  });

  it("どのメールにもサイトへのリンク（お客さま＝地図の画面、事業主＝管理画面、運営者＝管理画面）", async () => {
    const { mailFooter } = await import("@/lib/mail");
    const { APP_URL } = await import("@/lib/config");
    expect(mailFooter("customer")).toContain(`href="${APP_URL}/"`);
    expect(mailFooter("customer")).toContain("佐賀観光マップを開く");
    expect(mailFooter("business")).toContain(`${APP_URL}/dashboard/business`);
    expect(mailFooter("business")).toContain("事業主の管理画面を開く");
    expect(mailFooter("admin")).toContain(`${APP_URL}/admin`);
  });
});
