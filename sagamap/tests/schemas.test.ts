import { describe, expect, it } from "vitest";
import { businessRegisterSchema, couponCreateSchema, customerRegisterSchema, storeUpdateSchema } from "@/lib/schemas";

describe("customerRegisterSchema", () => {
  it("メールは小文字にそろえる", () => {
    const r = customerRegisterSchema.parse({ name: "佐賀", email: "Foo@Example.JP", password: "password123" });
    expect(r.email).toBe("foo@example.jp");
  });
  it("短いパスワード・存在しない業種は拒否", () => {
    expect(customerRegisterSchema.safeParse({ name: "a", email: "a@b.jp", password: "short" }).success).toBe(false);
    expect(
      customerRegisterSchema.safeParse({ name: "a", email: "a@b.jp", password: "password123", interests: ["カジノ"] }).success,
    ).toBe(false);
  });
});

describe("businessRegisterSchema", () => {
  it("必須項目が無いと拒否", () => {
    expect(businessRegisterSchema.safeParse({ email: "a@b.jp", password: "password123" }).success).toBe(false);
  });
});

describe("couponCreateSchema", () => {
  const base = { businessId: 1, title: "10% OFF", discountRate: 10 };
  it("過去の有効期限・範囲外の割引率は拒否", () => {
    expect(couponCreateSchema.safeParse({ ...base, expiresAt: "2000-01-01" }).success).toBe(false);
    expect(couponCreateSchema.safeParse({ ...base, discountRate: 150, expiresAt: "2099-01-01" }).success).toBe(false);
  });
  it("正しい値は通る", () => {
    expect(couponCreateSchema.safeParse({ ...base, expiresAt: "2099-01-01" }).success).toBe(true);
  });
});

describe("storeUpdateSchema", () => {
  it("javascript: などの URL は拒否", () => {
    expect(storeUpdateSchema.safeParse({ instagramUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(storeUpdateSchema.safeParse({ instagramUrl: "https://instagram.com/saga" }).success).toBe(true);
  });
});
