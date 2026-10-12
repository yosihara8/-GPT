import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { reportHtml } from "@/lib/owner-report";
import type { Metrics } from "@/lib/owner-report-shared";

const m = (n: number): Metrics => ({ views: 40 * n, viewers: 25 * n, route: 6 * n, call: 2 * n, save: 3 * n, share: n, coupon_view: 9 * n, coupon_uses: 3 * n, qr_scan: n, favorites: n, ad_views: 0, ad_clicks: 0 });

describe("月次レポートのメール", () => {
  const html = reportHtml({
    ownerId: 1,
    name: "佐賀 太郎",
    email: "owner@example.com",
    premium: true,
    month: "2026-09",
    label: "2026年9月",
    stores: [{ id: 1, name: "カフェ <栄の国>", cur: m(2), prev: m(1), profile: 70, todo: ["メニュー・商品 3 品以上"], advice: ["QR ポスターを置きましょう"] }],
  });
  it("数字・先月比・次にやることが入り、店名は安全に表示する", () => {
    expect(html).toContain("2026年9月のレポート");
    expect(html).toContain("▲6");
    expect(html).toContain("次にやること");
    expect(html).toContain("カフェ &lt;栄の国&gt;");
    expect(html).not.toContain("<栄の国>");
    expect(html).toContain("/dashboard/business/report#settings");
    if (process.env.REPORT_HTML_OUT) writeFileSync(process.env.REPORT_HTML_OUT, html);
  });
});
