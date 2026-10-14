import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { query } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { OPERATOR } from "@/lib/config";
import { INQUIRY_ROLE, INQUIRY_STATUS, type InquiryStatus } from "@/lib/inquiry";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  role: keyof typeof INQUIRY_ROLE;
  name: string;
  email: string;
  category: string;
  body: string;
  status: InquiryStatus;
  admin_note: string;
  created_at: Date;
  updated_at: Date;
};

/** お問い合わせの一覧を Excel で書き出す: GET /api/admin/inquiries/export?status=new */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const status = req.nextUrl.searchParams.get("status");
  const rows = await query<Row>(
    `SELECT id, role, name, email, category, body, status, admin_note, created_at, updated_at
       FROM inquiries WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC`,
    [status && status in INQUIRY_STATUS ? status : null],
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = OPERATOR.name;
  const ws = wb.addWorksheet("お問い合わせ一覧", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "受付番号", key: "id", width: 9 },
    { header: "受付日時", key: "created_at", width: 18, style: { numFmt: "yyyy/mm/dd hh:mm" } },
    { header: "対応状況", key: "status", width: 10 },
    { header: "区分", key: "role", width: 10 },
    { header: "お名前", key: "name", width: 18 },
    { header: "メールアドレス", key: "email", width: 28 },
    { header: "種類", key: "category", width: 22 },
    { header: "お問い合わせ内容", key: "body", width: 60 },
    { header: "対応メモ", key: "admin_note", width: 40 },
    { header: "最終更新", key: "updated_at", width: 18, style: { numFmt: "yyyy/mm/dd hh:mm" } },
  ];
  // Excel は時刻を持たないため、日本時間に直して入れる
  const jst = (d: Date) => new Date(new Date(d).getTime() + 9 * 3600 * 1000);
  for (const r of rows) {
    ws.addRow({
      ...r,
      created_at: jst(r.created_at),
      updated_at: jst(r.updated_at),
      status: INQUIRY_STATUS[r.status],
      role: INQUIRY_ROLE[r.role],
    });
  }
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A6E" } };
  header.alignment = { vertical: "middle" };
  ws.eachRow((row, n) => {
    row.alignment = { vertical: "top", wrapText: true };
    if (n > 1 && row.getCell("status").value === "未対応") row.getCell("status").font = { bold: true, color: { argb: "FFC43D2B" } };
  });
  ws.autoFilter = { from: "A1", to: "J1" };

  await auditLog(auth.user.id, "お問い合わせを Excel で書き出し", "inquiries", `${rows.length} 件`);
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const date = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inquiries-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
