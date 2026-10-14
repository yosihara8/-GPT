import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { decodeJpegBase64 } from "@/lib/upload-image";
import { ownsBusiness, requireApiUser } from "@/lib/session";
import { checkPromoText, blockedMessage } from "@/lib/content-check";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 50;

/** メニュー・商品の一覧（だれでも見られる） */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const items = await query(
    `SELECT id, name, price, description, (image IS NOT NULL) AS has_image FROM menu_items WHERE business_id = $1 ORDER BY sort, id LIMIT ${MAX_ITEMS}`,
    [Number(params.id)],
  );
  return NextResponse.json({ items });
}

const schema = z.object({
  name: z.string().trim().min(1, "名前を入れてください").max(60),
  price: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(0).max(10_000_000).optional()),
  description: z.string().trim().max(200).default(""),
  imageBase64: z.string().max(2_100_000, "画像は 1.5MB 以下にしてください").optional(),
});

/** メニュー・商品を追加（事業主。無料プランでも使える） */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  if (!(await ownsBusiness(auth.user.id, id))) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const d = body.data;
  const count = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM menu_items WHERE business_id = $1", [id]);
  if ((count?.n ?? 0) >= MAX_ITEMS) return NextResponse.json({ error: `メニュー・商品は ${MAX_ITEMS} 件までです` }, { status: 400 });
  const check = checkPromoText(`${d.name}\n${d.description}`);
  if (check.blocked.length) return NextResponse.json({ error: blockedMessage(check) }, { status: 400 });
  let image: Buffer | null = null;
  if (d.imageBase64) {
    const decoded = decodeJpegBase64(d.imageBase64);
    if (!decoded.ok) return NextResponse.json({ error: decoded.error }, { status: 400 });
    image = decoded.image;
  }
  const row = await queryOne(
    `INSERT INTO menu_items (business_id, name, price, description, image, image_type, sort)
     VALUES ($1, $2, $3, $4, $5, $6, (SELECT coalesce(max(sort), 0) + 1 FROM menu_items WHERE business_id = $1))
     RETURNING id, name, price, description, (image IS NOT NULL) AS has_image`,
    [id, d.name, (d.price as number | undefined) ?? null, d.description, image, image ? "image/jpeg" : null],
  );
  return NextResponse.json({ item: row }, { status: 201 });
}

/** メニュー・商品を削除: DELETE /api/businesses/[id]/menu?itemId= */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  if (!(await ownsBusiness(auth.user.id, id))) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  const itemId = Number(new URL(req.url).searchParams.get("itemId"));
  await query("DELETE FROM menu_items WHERE id = $1 AND business_id = $2", [itemId, id]);
  return NextResponse.json({ ok: true });
}
