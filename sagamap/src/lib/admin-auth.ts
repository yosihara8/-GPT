import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { queryOne } from "./db";
import { AUTH_SECRET } from "./config";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, signAdmin, verifyAdmin } from "./admin-session";

export type AdminUser = { id: number; name: string; email: string; role: "admin" };

/** いまの運営者（管理画面の Cookie を確かめ、パスワード変更などで無効になっていないかも DB で確認） */
export async function getAdmin(): Promise<AdminUser | null> {
  const claims = await verifyAdmin((await cookies()).get(ADMIN_COOKIE)?.value, AUTH_SECRET ?? "");
  if (!claims) return null;
  const row = await queryOne<{ id: number; name: string; email: string; session_version: number }>(
    "SELECT id, name, email, session_version FROM admins WHERE id = $1",
    [claims.id],
  );
  if (!row || row.session_version !== claims.sv) return null;
  return { id: row.id, name: row.name, email: row.email, role: "admin" };
}

/** ログインした運営者の Cookie を付ける（JavaScript から読めない・他のサイトから送られない） */
export async function setAdminCookie(res: NextResponse, id: number, sv: number) {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_HOURS * 3600;
  res.cookies.set(ADMIN_COOKIE, await signAdmin({ id, sv, exp }, AUTH_SECRET ?? ""), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  return res;
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
