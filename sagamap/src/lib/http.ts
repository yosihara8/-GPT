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

/**
 * 画像を返す。中身が変わらない画像（写真の ID・版番号つきの URL）は 1 年、変わり得るものは 5 分、
 * ブラウザと Vercel の CDN に置かせる（同じ写真を何度も DB から読まないので、アクセスが増えても重くならない）。
 */
export function imageResponse(image: Buffer, type: string | null, immutable: boolean) {
  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": type ?? "image/jpeg",
      "Cache-Control": immutable
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** だれが見ても同じ一覧（店舗一覧・観光名所など）を CDN に短時間置く */
export const PUBLIC_LIST_CACHE = { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=300" };
