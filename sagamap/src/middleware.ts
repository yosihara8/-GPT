import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/** 会員登録必須ページ（地図トップ `/` は未登録でも閲覧可） */
export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    const needs = path.startsWith("/dashboard/customer") ? "customer" : "business";
    if (role !== needs) {
      const url = new URL("/login", req.url);
      url.searchParams.set("role", needs);
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }
  },
  {
    callbacks: { authorized: ({ token }) => Boolean(token) },
    pages: { signIn: "/login" },
  },
);

export const config = { matcher: ["/dashboard/:path*", "/upgrade"] };
