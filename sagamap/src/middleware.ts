import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { AUTH_SECRET } from "@/lib/config";
import { ADMIN_COOKIE, verifyAdmin } from "@/lib/admin-session";

/**
 * 会員登録必須ページ。
 * 地図トップ `/` と店舗ページ `/shops/*` も会員向け（未登録の方には最初に会員登録画面を表示する）。
 */
const authMiddleware = withAuth(
  async function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    if (isMemberMapPath(path)) {
      // ログインしていれば（お客さま・事業主・運営者）そのまま表示。未登録なら会員登録画面へ
      if (!role) {
        // 共有されたお店のリンク（/?shop=ID など）は、登録・ログインのあとにそのお店を開く
        const url = new URL("/register/customer", req.url);
        const next = path + req.nextUrl.search;
        if (next !== "/") url.searchParams.set("next", next);
        return NextResponse.redirect(url);
      }
      return;
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

const isMemberMapPath = (path: string) => path === "/" || path.startsWith("/shops/");

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
