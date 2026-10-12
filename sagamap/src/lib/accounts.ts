import type { Role } from "./auth";

/** ロールごとのアカウント表 */
export const ACCOUNT_TABLE: Record<Role, "business_owners" | "customers" | "admins"> = {
  business: "business_owners",
  customer: "customers",
  admin: "admins",
};

export function passwordRule(role: Role) {
  return role === "admin" ? 12 : 8;
}

/** よく使われる・推測されやすいパスワード（乗っ取りの多くはこれらの使い回しから起きる） */
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "11111111", "00000000",
  "qwertyui", "qwerty123", "abcd1234", "abc12345", "1q2w3e4r", "iloveyou", "sagasaga", "saga1234", "admin123", "letmein1",
  "asdfghjk", "zxcvbnm1", "aaaaaaaa", "88888888", "87654321", "welcome1", "p@ssw0rd",
]);

/** 推測されやすいパスワードなら理由を返す（問題なければ null） */
export function weakPasswordReason(password: string, email?: string) {
  const p = password.toLowerCase();
  if (COMMON.has(p)) return "よく使われていて推測されやすいパスワードです。別のパスワードにしてください";
  if (/^(.)\1+$/.test(p)) return "同じ文字だけのパスワードは使えません";
  if ("0123456789012345678901234567890".includes(p) || "abcdefghijklmnopqrstuvwxyz".includes(p)) return "連続した文字だけのパスワードは使えません";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && p.includes(local)) return "メールアドレスを含むパスワードは推測されやすいため使えません";
  return null;
}
