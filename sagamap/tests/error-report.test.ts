import { describe, expect, it } from "vitest";
import { errorReportHtml, redact } from "../src/lib/error-report";

describe("エラー報告の個人情報の伏せ字", () => {
  it("メールアドレス・電話番号・キー・接続先を伏せる", () => {
    const t = redact("user taro.yamada@gmail.com tel 090-1234-5678 key sk_live_abcdefghijklmnop db postgres://u:p@host/db");
    expect(t).not.toContain("taro.yamada@gmail.com");
    expect(t).not.toContain("090-1234-5678");
    expect(t).not.toContain("sk_live_abcdefghijklmnop");
    expect(t).not.toContain("postgres://");
    expect(t).toContain("[メール]");
    expect(t).toContain("[電話]");
  });
  it("ふつうのエラー文はそのまま", () => {
    expect(redact("TypeError: Cannot read properties of undefined (reading 'id')")).toBe("TypeError: Cannot read properties of undefined (reading 'id')");
  });
  it("報告メールの HTML は中身をエスケープする", () => {
    const html = errorReportHtml([{ source: "server", where: "billing", message: "<script>x</script>", count: 3, first: "10/14 01:00", last: "10/14 02:00", stack: null }], "https://example.com/admin");
    expect(html).toContain("3 件");
    expect(html).not.toContain("<script>");
  });
});
