import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { AUTH_SECRET } from "@/lib/config";

/** 会員登録必須ページ（地図トップ `/` は未登録でも閲覧可） */
export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
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
      authorized: ({ token, req }) => req.nextUrl.pathname.startsWith("/admin") || Boolean(token),
    },
    pages: { signIn: "/login" },
    secret: AUTH_SECRET,
  },
);

// /admin/login と /admin/setup はログイン前に開くページなので対象外
export const config = { matcher: ["/dashboard/:path*", "/upgrade", "/admin", "/admin/((?!login|setup).*)"] };
