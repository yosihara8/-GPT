import { afterEach, describe, expect, it } from "vitest";
import { stripeEnv } from "../src/lib/stripe";

describe("stripeEnv", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_STANDARD;
  });
  it("removes stray whitespace and newlines", () => {
    process.env.STRIPE_SECRET_KEY = "  sk_test_abc123\n";
    expect(stripeEnv("STRIPE_SECRET_KEY")).toBe("sk_test_abc123");
  });
  it("removes an accidental NAME= prefix and quotes", () => {
    process.env.STRIPE_PRICE_STANDARD = 'STRIPE_PRICE_STANDARD="price_1ABC"';
    expect(stripeEnv("STRIPE_PRICE_STANDARD")).toBe("price_1ABC");
  });
  it("treats empty values as unset", () => {
    process.env.STRIPE_SECRET_KEY = " \n";
    expect(stripeEnv("STRIPE_SECRET_KEY")).toBeUndefined();
  });
});
