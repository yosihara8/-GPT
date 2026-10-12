import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { EVENT_COLUMNS } from "@/lib/events";
import { PUBLIC_LIST_CACHE } from "@/lib/http";

export const dynamic = "force-dynamic";

/** 開催中と、60 日以内に始まるイベント特集（だれでも見られる） */
export async function GET() {
  const events = await query(
    `SELECT ${EVENT_COLUMNS("e")} FROM events e
      WHERE e.is_published
        AND e.ends_on >= (now() AT TIME ZONE 'Asia/Tokyo')::date
        AND e.starts_on <= (now() AT TIME ZONE 'Asia/Tokyo')::date + 60
      ORDER BY e.starts_on`,
  );
  return NextResponse.json({ events }, { headers: PUBLIC_LIST_CACHE });
}
