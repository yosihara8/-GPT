import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_LIST_TYPES, CSV_COLUMNS, adminList, csvCell, type AdminListType } from "@/lib/admin-data";
import { auditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** CSV 書き出し: GET /api/admin/export?type=customers （Excel で文字化けしないよう BOM 付き） */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const type = req.nextUrl.searchParams.get("type") as AdminListType;
  if (!ADMIN_LIST_TYPES.includes(type)) return NextResponse.json({ error: "不明な種類です" }, { status: 400 });

  const rows = await adminList(type, req.nextUrl.searchParams.get("q") ?? "", 50000);
  const cols = CSV_COLUMNS[type];
  const lines = [
    cols.map(([, label]) => csvCell(label)).join(","),
    ...rows.map((r) => cols.map(([key]) => csvCell((r as Record<string, unknown>)[key])).join(",")),
  ];
  await auditLog(auth.user.id, "CSV を書き出し", type, `${rows.length} 件`);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sagamap-${type}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
