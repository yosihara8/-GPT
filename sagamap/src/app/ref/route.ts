import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** 紹介リンク: https://sagamap.jp/ref?biz_id=123 → 紹介元を Cookie に保存して顧客登録へ */
export function GET(req: NextRequest) {
  const bizId = Number(req.nextUrl.searchParams.get("biz_id"));
  const target = new URL("/register/customer", req.nextUrl.origin);
  if (Number.isInteger(bizId) && bizId > 0) target.searchParams.set("ref", String(bizId));

  const res = NextResponse.redirect(target);
  if (Number.isInteger(bizId) && bizId > 0) {
    res.cookies.set("sagamap_ref", String(bizId), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
