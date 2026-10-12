import { NextResponse } from "next/server";
import { imageResponse } from "@/lib/http";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** メニュー・商品の写真 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await queryOne<{ image: Buffer | null; image_type: string | null }>("SELECT image, image_type FROM menu_items WHERE id = $1", [
    Number(params.id),
  ]);
  if (!row?.image) return new NextResponse(null, { status: 404 });
  return imageResponse(row.image, row.image_type, true);
}
