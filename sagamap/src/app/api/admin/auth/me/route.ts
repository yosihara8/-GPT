import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** 管理画面のヘッダー用：ログイン中の運営者 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  return NextResponse.json({ admin: { name: admin.name, email: admin.email } });
}
