import { NextResponse } from "next/server";
import { imageResponse } from "@/lib/http";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** お店の写真（外観・店内・商品など） */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await queryOne<{ image: Buffer | null; image_type: string | null }>("SELECT image, image_type FROM business_photos WHERE id = $1", [
    Number(params.id),
  ]);
  if (!row?.image) return new NextResponse(null, { status: 404 });
  return imageResponse(row.image, row.image_type, true);
}
