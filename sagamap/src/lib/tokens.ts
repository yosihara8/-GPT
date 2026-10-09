import { createHash, randomBytes } from "node:crypto";
import { query, queryOne } from "./db";
import type { Role } from "./auth";

export type TokenPurpose = "reset_password" | "verify_email" | "impersonate";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** 1 回限りのトークンを発行する（DB にはハッシュだけを保存） */
export async function createToken(purpose: TokenPurpose, role: Role, userId: number, ttlMinutes: number) {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO auth_tokens (token_hash, purpose, role, user_id, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
    [hash(token), purpose, role, userId, ttlMinutes],
  );
  return token;
}

/** トークンを使用済みにして、持ち主を返す（無効・期限切れ・使用済みなら null） */
export async function consumeToken(purpose: TokenPurpose, token: string) {
  if (!token || token.length > 100) return null;
  return queryOne<{ role: Role; user_id: number }>(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING role, user_id`,
    [hash(token), purpose],
  );
}

/** トークンが有効か確認する（使用済みにはしない） */
export async function peekToken(purpose: TokenPurpose, token: string) {
  if (!token || token.length > 100) return null;
  return queryOne<{ role: Role; user_id: number }>(
    `SELECT role, user_id FROM auth_tokens
      WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()`,
    [hash(token), purpose],
  );
}
