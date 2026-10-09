import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** 特別招待コードが使えるか（特別登録ページで使用） */
export async function GET(req: NextRequest) {
  const rl = await rateLimit(`invite-check:${clientIp(req.headers)}`, 30, 10 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase().slice(0, 40);
  const row = code
    ? await queryOne(
        `SELECT 1 FROM invite_codes
          WHERE code = $1 AND is_active AND used_count < max_uses AND (expires_at IS NULL OR expires_at > now())`,
        [code],
      )
    : null;
  return NextResponse.json({ valid: Boolean(row) });
}
