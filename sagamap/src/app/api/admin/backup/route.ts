import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { backupFilename, exportBackup } from "@/lib/backup";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 全データのバックアップ（JSON）。毎月 1 日には運営者にメールでも自動送信している */
export async function GET() {
  const auth = await requireApiUser("admin");
  if (!auth.ok) return auth.response;
  const backup = await exportBackup();
  await auditLog(auth.user.id, "バックアップを書き出し", "all");
  return new NextResponse(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backupFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
