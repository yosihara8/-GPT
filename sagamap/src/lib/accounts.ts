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
