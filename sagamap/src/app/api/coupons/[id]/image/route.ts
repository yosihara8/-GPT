import { NextResponse } from "next/server";
import { imageResponse } from "@/lib/http";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** クーポン画像の表示 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const row = await queryOne<{ image: Buffer | null; image_type: string | null }>(
    "SELECT image, image_type FROM coupons WHERE id = $1 AND deleted_at IS NULL",
    [Number(params.id)],
  );
  if (!row?.image) return new NextResponse(null, { status: 404 });
  return imageResponse(row.image, row.image_type, true);
}
