import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export async function parseBody<T>(req: Request, schema: ZodSchema<T>) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: "JSON を送信してください" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".") || "入力"}: ${i.message}`).join(" / ");
    return { ok: false as const, response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { ok: true as const, data: parsed.data };
}

export function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}
