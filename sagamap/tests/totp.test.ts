import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, totpAt, verifyTotp } from "@/lib/totp";

// RFC 6238 の試験用の値（秘密鍵 "12345678901234567890"、SHA1）
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("二段階認証", () => {
  it("RFC 6238 の値と一致する", () => {
    expect(totpAt(SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(SECRET, Math.floor(2000000000 / 30))).toBe("279037");
  });
  it("base32 の往復", () => {
    expect(base32Decode(SECRET).toString()).toBe("12345678901234567890");
  });
  it("前後 30 秒まで受け付け、それ以外は断る", () => {
    const now = 1111111109 * 1000;
    expect(verifyTotp(SECRET, "081804", now)).not.toBeNull();
    expect(verifyTotp(SECRET, "081804", now + 20_000)).not.toBeNull();
    expect(verifyTotp(SECRET, "081804", now + 95_000)).toBeNull();
    expect(verifyTotp(SECRET, "000000", now)).toBeNull();
    expect(verifyTotp(SECRET, "abc", now)).toBeNull();
  });
});
