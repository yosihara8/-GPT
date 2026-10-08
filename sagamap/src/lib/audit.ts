import { query } from "./db";

/** 運営者の操作を記録する（誰が・いつ・何をしたか） */
export async function auditLog(adminId: number, action: string, target: string, detail = "") {
  await query("INSERT INTO admin_audit_logs (admin_id, action, target, detail) VALUES ($1, $2, $3, $4)", [
    adminId,
    action,
    target,
    detail.slice(0, 500),
  ]);
}
