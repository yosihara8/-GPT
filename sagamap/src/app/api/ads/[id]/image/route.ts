import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 広告画像の表示（地図上部のバナー・事業主の出稿履歴） */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await queryOne<{ image: Buffer | null; image_type: string | null }>("SELECT image, image_type FROM ads WHERE id = $1", [
    Number(params.id),
  ]);
  if (!row?.image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    headers: {
      "Content-Type": row.image_type ?? "image/jpeg",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
