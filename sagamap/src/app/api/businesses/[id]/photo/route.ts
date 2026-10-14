import { NextResponse } from "next/server";
import { imageResponse } from "@/lib/http";
import { query, queryOne } from "@/lib/db";
import { ownsBusiness, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const MAX_BYTES = 1.5 * 1024 * 1024;

/** 店舗写真の表示 */
export async function GET(req: Request, props: Ctx) {
  const params = await props.params;
  const row = await queryOne<{ photo: Buffer | null; photo_type: string | null }>(
    "SELECT photo, photo_type FROM businesses WHERE id = $1",
    [Number(params.id)],
  );
  if (!row?.photo) return new NextResponse(null, { status: 404 });
  // ?v=（写真を変えた日時）つきの URL は中身が変わらないので長く置く
  return imageResponse(row.photo, row.photo_type, new URL(req.url).searchParams.has("v"));
}

/** 店舗写真の登録（ブラウザ側で縮小した JPEG を送る） */
export async function PUT(req: Request, props: Ctx) {
  const params = await props.params;
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  if (!(await ownsBusiness(auth.user.id, id))) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "写真は 1.5MB 以下にしてください" }, { status: 400 });
  }
  // 中身が本当に JPEG か確認（拡張子や Content-Type は偽装できるため）
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
    return NextResponse.json({ error: "JPEG 形式の画像を送ってください" }, { status: 400 });
  }
  await query("UPDATE businesses SET photo = $1, photo_type = 'image/jpeg', photo_updated_at = now() WHERE id = $2", [buf, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, props: Ctx) {
  const params = await props.params;
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  if (!(await ownsBusiness(auth.user.id, id))) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  await query("UPDATE businesses SET photo = NULL, photo_type = NULL, photo_updated_at = NULL WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
