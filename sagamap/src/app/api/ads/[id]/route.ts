import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { blockedMessage, checkAd } from "@/lib/content-check";
import { decodeJpegBase64 } from "@/lib/upload-image";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  headline: z.string().trim().min(1, "見出しは必須です").max(60),
  body: z.string().trim().max(120).default(""),
  /** 新しい写真（任意）。JPEG を base64 にしたもの */
  imageBase64: z.string().max(2_100_000, "画像は 1.5MB 以下にしてください").optional(),
  /** true なら写真を外す */
  removeImage: z.boolean().default(false),
});

/**
 * 出稿した広告の修正（事業主）。月 2 回の出稿回数は使わない。掲載期間は変わらない。
 * 修正後も自動チェックを行い、要確認なら運営者の確認待ちに戻す。
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  const d = body.data;

  const check = checkAd({ headline: d.headline, body: d.body });
  if (check.blocked.length) return NextResponse.json({ error: blockedMessage(check), reasons: check.blocked }, { status: 400 });

  let image: Buffer | null = null;
  if (d.imageBase64) {
    const decoded = decodeJpegBase64(d.imageBase64);
    if (!decoded.ok) return NextResponse.json({ error: decoded.error }, { status: 400 });
    image = decoded.image;
  }
  // 写真: 新しい写真があれば差し替え、「外す」なら削除、どちらでもなければそのまま
  const imageSql = image ? "image = $5, image_type = 'image/jpeg'," : d.removeImage ? "image = NULL, image_type = NULL," : "";
  const values: unknown[] = [Number(params.id), auth.user.id, d.headline, d.body ?? ""];
  if (image) values.push(image);
  values.push(check.warnings);

  const row = await queryOne(
    `UPDATE ads a SET headline = $3, body = $4, ${imageSql}
            review_flags = $${values.length}, reviewed_at = NULL, updated_at = now()
       FROM businesses b
      WHERE a.id = $1 AND b.id = a.business_id AND b.owner_id = $2
      RETURNING a.id, a.headline, a.body, a.ends_at, (a.image IS NOT NULL) AS has_image`,
    values,
  );
  if (!row) return NextResponse.json({ error: "広告が見つかりません" }, { status: 404 });
  return NextResponse.json({ ad: row, warnings: check.warnings });
}
