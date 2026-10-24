import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { AUTH_SECRET } from "@/lib/config";
import { ADMIN_COOKIE, verifyAdmin } from "@/lib/admin-session";

/**
 * 会員登録必須ページ。
 * 地図トップ `/` は会員向け（登録前の方は登録前のトップ /welcome へ。地図は見るだけ）。お店のページ `/shops/*` は最低限の情報だけ公開。
 * 運営者は管理画面のログインのままで `/` を確認できる。
 */
const authMiddleware = withAuth(
  async function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    if (isMemberMapPath(path)) {
      // ログインしていれば（お客さま・事業主）そのまま表示
      if (role) return;
      // 運営者（管理画面にログイン中）も、お客さまの地図の画面をそのまま確認できる
      if (await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value, AUTH_SECRET ?? "")) return;
      // 共有されたお店のリンク（/?shop=ID）は、そのお店の公開ページへ
      const shop = req.nextUrl.searchParams.get("shop");
      if (shop && /^\d+$/.test(shop)) return NextResponse.redirect(new URL(`/shops/${shop}`, req.url));
      // 登録前の方は、登録前のトップ（地図は見るだけ・会員登録の案内）へ
      return NextResponse.redirect(new URL("/welcome", req.url));
    }
    // 管理画面は専用のログイン（お客さま・事業主のログインとは別の Cookie）。署名と期限を確かめる
    if (path.startsWith("/admin")) {
      const ok = await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value, AUTH_SECRET ?? "");
      if (!ok) return NextResponse.redirect(new URL("/admin/login", req.url));
      return;
    }
    const needs = path.startsWith("/dashboard/customer") ? "customer" : "business";
    if (role !== needs) {
      const url = new URL("/login", req.url);
      url.searchParams.set("role", needs);
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
  },
  {
    callbacks: {
      // 管理画面は未ログインなら /admin/login へ（middleware 本体でリダイレクト）
      authorized: ({ token, req }) => req.nextUrl.pathname.startsWith("/admin") || isMemberMapPath(req.nextUrl.pathname) || Boolean(token),
    },
    pages: { signIn: "/login" },
    secret: AUTH_SECRET,
  },
);

// お店のページ（/shops/*）は検索エンジンのため誰でも見られる最低限の公開（オーナー決定）。地図のトップだけ会員向け
const isMemberMapPath = (path: string) => path === "/";

/** 会員・運営者のログインが必要なページ（/admin/login・/admin/forgot はログイン前に開くので対象外） */
const needsLogin = (path: string) =>
  isMemberMapPath(path) ||
  path.startsWith("/dashboard/") ||
  path === "/dashboard" ||
  path === "/upgrade" ||
  path === "/admin" ||
  (path.startsWith("/admin/") && !path.startsWith("/admin/login") && !path.startsWith("/admin/forgot"));

/**
 * 本番前の公開制限（ベーシック認証）。Vercel の環境変数 BASIC_AUTH_USER と BASIC_AUTH_PASSWORD を
 * 両方入れたときだけ有効（消して再デプロイすると一般公開）。ID・パスワードはコードに書かない。
 * Stripe の決済の知らせと Vercel の定期処理は、ブラウザではないので対象外にする（止めると決済・自動処理が壊れる）。
 */
const BASIC_USER = process.env.BASIC_AUTH_USER?.trim();
const BASIC_PASSWORD = process.env.BASIC_AUTH_PASSWORD?.trim();
const BASIC_EXEMPT = ["/api/billing/webhook", "/api/cron/"];

function sameText(a: string, b: string) {
  // 文字を比べる時間で中身を推測されないよう、最後まで比べる
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function basicAuthPassed(req: NextRequest) {
  if (!BASIC_USER || !BASIC_PASSWORD) return true;
  if (BASIC_EXEMPT.some((p) => req.nextUrl.pathname.startsWith(p))) return true;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  return i > 0 && sameText(decoded.slice(0, i), BASIC_USER) && sameText(decoded.slice(i + 1), BASIC_PASSWORD);
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!basicAuthPassed(req)) {
    return new NextResponse("佐賀観光マップは公開準備中です。", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="saga-kanko-map", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (needsLogin(req.nextUrl.pathname)) return authMiddleware(req as NextRequestWithAuth, event);
  return NextResponse.next();
}

// 画面・API のすべて（Next.js の配信用ファイルとアイコンを除く）
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
