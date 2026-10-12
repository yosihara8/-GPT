import { describe, expect, it } from "vitest";
import { weakPasswordReason } from "@/lib/accounts";

describe("推測されやすいパスワード", () => {
  it("断る", () => {
    expect(weakPasswordReason("password123")).not.toBeNull();
    expect(weakPasswordReason("aaaaaaaa")).not.toBeNull();
    expect(weakPasswordReason("12345678")).not.toBeNull();
    expect(weakPasswordReason("taro.saga2025", "taro.saga@example.com")).not.toBeNull();
  });
  it("ふつうのパスワードは通す", () => {
    expect(weakPasswordReason("kasa-ga-hana7", "taro@example.com")).toBeNull();
  });
});
