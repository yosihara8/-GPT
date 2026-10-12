import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { auditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/session";
import { EVENT_COLUMNS } from "@/lib/events";

export const dynamic = "force-dynamic";

/** イベント特集の一覧（運営者） */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const events = await query(`SELECT ${EVENT_COLUMNS("e")} FROM events e ORDER BY e.starts_on DESC LIMIT 200`);
  return NextResponse.json({ events });
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付を選んでください");
const fields = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "URL 用の名前は半角英数字とハイフンで 2〜41 文字にしてください"),
  title: z.string().trim().min(1, "イベント名を入れてください").max(60),
  subtitle: z.string().trim().max(80).default(""),
  description: z.string().trim().max(600).default(""),
  area: z.string().trim().max(40).default(""),
  startsOn: date,
  endsOn: date,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1E3A6E"),
  linkUrl: z.string().trim().url().refine((u) => /^https?:\/\//.test(u)).or(z.literal("")).nullish(),
  lat: z.number().min(20).max(50).nullish(),
  lng: z.number().min(120).max(150).nullish(),
  isPublished: z.boolean().default(true),
};
const createSchema = z.object(fields).refine((d) => d.endsOn >= d.startsOn, { message: "終わりの日は始まりの日より後にしてください", path: ["endsOn"] });
const updateSchema = z
  .object({ id: z.number().int(), ...fields })
  .refine((d) => d.endsOn >= d.startsOn, { message: "終わりの日は始まりの日より後にしてください", path: ["endsOn"] });

type EventInput = z.output<typeof createSchema>;
const values = (d: EventInput) => [
  d.slug,
  d.title,
  d.subtitle,
  d.description,
  d.area,
  d.startsOn,
  d.endsOn,
  d.color,
  d.linkUrl || null,
  d.lat ?? null,
  d.lng ?? null,
  d.isPublished,
];

/** イベント特集を作る */
export async function POST(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;
  const dup = await queryOne("SELECT id FROM events WHERE slug = $1", [body.data.slug]);
  if (dup) return NextResponse.json({ error: "同じ URL 用の名前のイベントがあります（例：balloon-2026 のように年を付けてください）" }, { status: 400 });
  const row = await queryOne<{ id: number }>(
    `INSERT INTO events (slug, title, subtitle, description, area, starts_on, ends_on, color, link_url, lat, lng, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    values(body.data as EventInput),
  );
  await auditLog(auth.user.id, "イベント特集を作成", `event:${row?.id}`, body.data.title);
  return NextResponse.json({ ok: true, id: row?.id }, { status: 201 });
}

/** イベント特集を直す */
export async function PATCH(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, updateSchema);
  if (!body.ok) return body.response;
  const dup = await queryOne("SELECT id FROM events WHERE slug = $1 AND id <> $2", [body.data.slug, body.data.id]);
  if (dup) return NextResponse.json({ error: "同じ URL 用の名前のイベントがあります" }, { status: 400 });
  await query(
    `UPDATE events SET slug = $1, title = $2, subtitle = $3, description = $4, area = $5, starts_on = $6, ends_on = $7, color = $8,
            link_url = $9, lat = $10, lng = $11, is_published = $12 WHERE id = $13`,
    [...values(body.data as EventInput), body.data.id],
  );
  await auditLog(auth.user.id, "イベント特集を変更", `event:${body.data.id}`, body.data.title);
  return NextResponse.json({ ok: true });
}

/** イベント特集を消す（限定クーポンは通常のクーポンとして残る） */
export async function DELETE(req: Request) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const id = Number(new URL(req.url).searchParams.get("id"));
  await query("DELETE FROM events WHERE id = $1", [id]);
  await auditLog(auth.user.id, "イベント特集を削除", `event:${id}`);
  return NextResponse.json({ ok: true });
}
