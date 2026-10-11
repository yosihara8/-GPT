import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/http";
import { planRoute } from "@/lib/routing";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const schema = z.object({
  mode: z.enum(["foot", "car"]).default("foot"),
  points: z.array(point).min(2, "行き先を 1 か所以上選んでください").max(10, "行き先は 9 か所までです"),
});

/**
 * 道に沿ったルート（出発地 + 行き先。順番は自動で最適化）。
 * 会員登録前の方も 1 か所への経路は表示できる（回数は会員より少なく制限）。
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  const member = user?.role === "customer";
  const rl = await rateLimit(`route:${member ? "m" : "g"}:${clientIp(req.headers)}`, member ? 30 : 15, 10 * 60);
  if (!rl.ok) return NextResponse.json({ error: tooManyRequestsMessage(rl.retryAfter) }, { status: 429 });
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  if (!member && body.data.points.length > 2) {
    return NextResponse.json({ error: "複数の行き先を回るルートは、無料の会員登録で使えます" }, { status: 403 });
  }
  return NextResponse.json(await planRoute(body.data.points, body.data.mode ?? "foot"));
}
