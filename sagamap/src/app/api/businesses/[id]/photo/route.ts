import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { ownsBusiness, requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };
const MAX_BYTES = 1.5 * 1024 * 1024;

/** 店舗写真の表示 */
export async function GET(_req: Request, { params }: Ctx) {
  const row = await queryOne<{ photo: Buffer | null; photo_type: string | null }>(
    "SELECT photo, photo_type FROM businesses WHERE id = $1",
    [Number(params.id)],
  );
  if (!row?.photo) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.photo), {
    headers: {
      "Content-Type": row.photo_type ?? "image/jpeg",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** 店舗写真の登録（ブラウザ側で縮小した JPEG を送る） */
export async function PUT(req: Request, { params }: Ctx) {
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

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const id = Number(params.id);
  if (!(await ownsBusiness(auth.user.id, id))) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  await query("UPDATE businesses SET photo = NULL, photo_type = NULL, photo_updated_at = NULL WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
