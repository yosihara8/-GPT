import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { ownsBusiness, requireApiUser } from "@/lib/session";
import { addDays, isTime, jstParts, summarizeWeekly, type Weekly } from "@/lib/schedule";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const range = z.tuple([z.string().refine(isTime, "時刻の形式が正しくありません"), z.string().refine(isTime, "時刻の形式が正しくありません")]);
const ranges = z.array(range).max(2, "営業時間は 1 日 2 つまでです");

const weeklySchema = z.object({
  weekly: z.array(ranges).length(7),
  note: z.string().trim().max(200).default(""),
});

const daySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
    closed: z.boolean(),
    ranges: ranges.optional(),
    note: z.string().trim().max(60).default(""),
  })
  .superRefine((d, ctx) => {
    if (!d.closed && !d.ranges?.length) ctx.addIssue({ code: "custom", message: "特別営業の時間を入れてください", path: ["ranges"] });
    const today = jstParts().ymd;
    if (d.day < addDays(today, -1) || d.day > addDays(today, 400)) ctx.addIssue({ code: "custom", message: "設定できるのは今日から約 1 年先までです", path: ["day"] });
  });

async function guard(id: number) {
  const auth = await requireApiUser("business");
  if (!auth.ok) return auth.response;
  if (!(await ownsBusiness(auth.user.id, id))) return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  return null;
}

/** 曜日ごとの営業時間（定休日）を保存。お客さまの「営業中」表示・カレンダーに使う */
export async function PUT(req: Request, props: Ctx) {
  const params = await props.params;
  const id = Number(params.id);
  const denied = await guard(id);
  if (denied) return denied;
  const body = await parseBody(req, weeklySchema);
  if (!body.ok) return body.response;
  const weekly = body.data.weekly as Weekly;
  const sum = summarizeWeekly(weekly);
  await query(
    "UPDATE businesses SET weekly_hours = $1::jsonb, hours_note = $2, business_hours = $3, closed_days = $4 WHERE id = $5",
    [JSON.stringify(weekly), body.data.note, sum.hours, sum.closed, id],
  );
  return NextResponse.json({ ok: true, summary: sum });
}

/** 臨時休業・特別営業の日を登録（同じ日は上書き） */
export async function POST(req: Request, props: Ctx) {
  const params = await props.params;
  const id = Number(params.id);
  const denied = await guard(id);
  if (denied) return denied;
  const body = await parseBody(req, daySchema);
  if (!body.ok) return body.response;
  const d = body.data;
  await query(
    `INSERT INTO business_days (business_id, day, closed, ranges, note) VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (business_id, day) DO UPDATE SET closed = EXCLUDED.closed, ranges = EXCLUDED.ranges, note = EXCLUDED.note`,
    [id, d.day, d.closed, d.closed ? null : JSON.stringify(d.ranges), d.note],
  );
  return NextResponse.json({ ok: true });
}

/** 臨時休業・特別営業を取り消す（通常どおりに戻す） */
export async function DELETE(req: Request, props: Ctx) {
  const params = await props.params;
  const id = Number(params.id);
  const denied = await guard(id);
  if (denied) return denied;
  const day = new URL(req.url).searchParams.get("day") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "日付の形式が正しくありません" }, { status: 400 });
  await query("DELETE FROM business_days WHERE business_id = $1 AND day = $2", [id, day]);
  return NextResponse.json({ ok: true });
}
