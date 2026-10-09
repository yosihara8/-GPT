import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/escape";
import { csvCell } from "@/lib/admin-data";
import { clientIp } from "@/lib/rate-limit";

describe("escapeHtml", () => {
  it("HTML として解釈される文字を無害化する", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;",
    );
  });
});

describe("csvCell", () => {
  it("数式として実行される先頭文字を無効化する", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell("@SUM")).toBe(`"'@SUM"`);
  });
  it("通常の値・null・日付", () => {
    expect(csvCell("佐賀")).toBe(`"佐賀"`);
    expect(csvCell(null)).toBe(`""`);
    expect(csvCell(new Date("2026-01-02T03:04:05Z"))).toBe(`"2026-01-02T03:04:05.000Z"`);
  });
});

describe("clientIp", () => {
  it("x-forwarded-for の先頭を使う", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientIp({ "x-real-ip": "9.9.9.9" })).toBe("9.9.9.9");
    expect(clientIp(undefined)).toBe("unknown");
  });
});
