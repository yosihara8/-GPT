import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { AUTH_SECRET } from "@/lib/config";

/**
 * 会員登録必須ページ。
 * 地図トップ `/` と店舗ページ `/shops/*` も会員向け（未登録の方には最初に会員登録画面を表示する）。
 */
export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    if (isMemberMapPath(path)) {
      // ログインしていれば（お客さま・事業主・運営者）そのまま表示。未登録なら会員登録画面へ
      if (!role) return NextResponse.redirect(new URL("/register/customer", req.url));
      return;
    }
    if (path.startsWith("/admin")) {
      if (role !== "admin") return NextResponse.redirect(new URL("/admin/login", req.url));
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

// /admin/login はログイン前に開くページなので対象外
export const config = { matcher: ["/", "/shops/:path*", "/dashboard/:path*", "/upgrade", "/admin", "/admin/((?!login).*)"] };
