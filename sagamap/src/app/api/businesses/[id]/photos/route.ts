import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { decodeJpegBase64 } from "@/lib/upload-image";
import { getOwnerPlan, ownsBusiness, requireApiUser } from "@/lib/session";
import { checkPromoText, blockedMessage } from "@/lib/content-check";
import { PHOTO_KINDS, PHOTO_LIMIT } from "@/lib/config";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** お店の写真の一覧（だれでも見られる） */
export async function GET(_req: Request, { params }: Ctx) {
  const photos = await query("SELECT id, kind, caption FROM business_photos WHERE business_id = $1 ORDER BY sort, id", [Number(params.id)]);
  return NextResponse.json({ photos });
}

async function guard(id: number) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return { denied: auth.response };
  if (!(await ownsBusiness(auth.user.id, id))) return { denied: NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 }) };
  return { ownerId: auth.user.id };
}

const addSchema = z.object({
  kind: z.enum(PHOTO_KINDS),
  caption: z.string().trim().max(60).default(""),
  imageBase64: z.string().min(1, "写真を選んでください").max(2_100_000, "画像は 1.5MB 以下にしてください"),
});

/** 写真を追加（無料プラン 5 枚・有料プラン 20 枚まで） */
export async function POST(req: Request, { params }: Ctx) {
  const id = Number(params.id);
  const g = await guard(id);
  if (g.denied) return g.denied;
  const body = await parseBody(req, addSchema);
  if (!body.ok) return body.response;
  const plan = await getOwnerPlan(g.ownerId);
  const limit = plan?.plan === "premium" ? PHOTO_LIMIT.premium : PHOTO_LIMIT.free;
  const count = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM business_photos WHERE business_id = $1", [id]);
  if ((count?.n ?? 0) >= limit) {
    const error =
      plan?.plan === "premium"
        ? `写真は ${limit} 枚までです。古い写真を削除してから追加してください`
        : `無料プランの写真は ${limit} 枚までです（有料プランは ${PHOTO_LIMIT.premium} 枚まで）`;
    return NextResponse.json({ error, upgradeUrl: plan?.plan === "premium" ? undefined : "/upgrade" }, { status: 400 });
  }
  if (body.data.caption) {
    const check = checkPromoText(body.data.caption);
    if (check.blocked.length) return NextResponse.json({ error: blockedMessage(check) }, { status: 400 });
  }
  const decoded = decodeJpegBase64(body.data.imageBase64);
  if (!decoded.ok) return NextResponse.json({ error: decoded.error }, { status: 400 });
  const row = await queryOne(
    `INSERT INTO business_photos (business_id, kind, caption, image, sort)
     VALUES ($1, $2, $3, $4, (SELECT coalesce(max(sort), 0) + 1 FROM business_photos WHERE business_id = $1))
     RETURNING id, kind, caption`,
    [id, body.data.kind, body.data.caption, decoded.image],
  );
  return NextResponse.json({ photo: row }, { status: 201 });
}

const patchSchema = z.object({
  /** 並び順（写真 ID を表示順に） */
  order: z.array(z.number().int()).max(100).optional(),
  /** 1 枚の種類・説明の変更 */
  photoId: z.number().int().optional(),
  kind: z.enum(PHOTO_KINDS).optional(),
  caption: z.string().trim().max(60).optional(),
});

/** 並べ替え・種類や説明の変更 */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number(params.id);
  const g = await guard(id);
  if (g.denied) return g.denied;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;
  const d = body.data;
  if (d.order) {
    await query(
      `UPDATE business_photos p SET sort = o.ord FROM unnest($2::int[]) WITH ORDINALITY AS o(pid, ord)
        WHERE p.id = o.pid AND p.business_id = $1`,
      [id, d.order],
    );
  }
  if (d.photoId) {
    if (d.caption) {
      const check = checkPromoText(d.caption);
      if (check.blocked.length) return NextResponse.json({ error: blockedMessage(check) }, { status: 400 });
    }
    await query("UPDATE business_photos SET kind = coalesce($3, kind), caption = coalesce($4, caption) WHERE id = $1 AND business_id = $2", [
      d.photoId,
      id,
      d.kind ?? null,
      d.caption ?? null,
    ]);
  }
  return NextResponse.json({ ok: true });
}

/** 写真を削除: DELETE /api/businesses/[id]/photos?photoId= */
export async function DELETE(req: Request, { params }: Ctx) {
  const id = Number(params.id);
  const g = await guard(id);
  if (g.denied) return g.denied;
  const photoId = Number(new URL(req.url).searchParams.get("photoId"));
  await query("DELETE FROM business_photos WHERE id = $1 AND business_id = $2", [photoId, id]);
  return NextResponse.json({ ok: true });
}
