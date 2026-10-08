import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_LIST_TYPES, adminList, type AdminListType } from "@/lib/admin-data";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 一覧: GET /api/admin/owners|stores|customers|logs?q=検索語 */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  if (!ADMIN_LIST_TYPES.includes(params.type as AdminListType)) {
    return NextResponse.json({ error: "不明な種類です" }, { status: 404 });
  }
  const rows = await adminList(params.type as AdminListType, req.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json({ rows });
}
