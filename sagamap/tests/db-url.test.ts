import { describe, expect, it } from "vitest";
import { pooledUrl } from "@/lib/db";

describe("Neon の接続プール", () => {
  it("直接の入口をプール用に変える", () => {
    expect(pooledUrl("postgres://u:p@ep-cool-sun-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")).toBe(
      "postgres://u:p@ep-cool-sun-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    );
  });
  it("すでにプール用・Neon 以外はそのまま", () => {
    const pooled = "postgres://u:p@ep-cool-sun-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    expect(pooledUrl(pooled)).toBe(pooled);
    expect(pooledUrl("postgres://postgres:pg@localhost:5432/s18")).toBe("postgres://postgres:pg@localhost:5432/s18");
    expect(pooledUrl(undefined)).toBeUndefined();
  });
});
