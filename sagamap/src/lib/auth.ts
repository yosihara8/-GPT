import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryOne } from "./db";
import { recordReferral } from "./referral";
import { AUTH_SECRET } from "./config";
import { clientIp, rateLimit, resetRateLimit, tooManyRequestsMessage } from "./rate-limit";
import { consumeToken } from "./tokens";
import { verifyTotp } from "./totp";
import { mailEnabled, mailFooter, sendMail } from "./mail";

export type Role = "business" | "customer" | "admin";

// Vercel 上で NEXTAUTH_URL が未設定なら本番ドメインを使う
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "メールアドレス",
    credentials: {
      email: { label: "メールアドレス", type: "email" },
      password: { label: "パスワード", type: "password" },
      role: { label: "種別", type: "text" },
      impersonate: { label: "代理ログイン", type: "text" },
      otp: { label: "確認コード", type: "text" },
    },
    async authorize(credentials, req) {
      // 管理者の代理ログイン（管理画面で発行した 1 回限り・2 分間有効のトークン）
      if (credentials?.impersonate) {
        const target = await consumeToken("impersonate", credentials.impersonate);
        if (!target || target.role === "admin") return null;
        const table = target.role === "business" ? "business_owners" : "customers";
        const row = await queryOne<{ id: number; name: string; email: string; session_version: number }>(
          `SELECT id, name, email, session_version FROM ${table} WHERE id = $1`,
          [target.user_id],
        );
        return row ? { id: String(row.id), name: row.name, email: row.email, role: target.role, impersonated: true, sv: row.session_version } : null;
      }

      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      const role: Role =
        credentials?.role === "business" ? "business" : credentials?.role === "admin" ? "admin" : "customer";
      if (!email || !password) return null;

      // 総当たり攻撃対策: 同じアカウントへは 15 分に 10 回、同じ接続元からは 15 分に 50 回まで
      const accountKey = `login:${role}:${email}`;
      const ip = clientIp(req?.headers);
      for (const [key, limit] of [
        [accountKey, 10],
        [`login-ip:${ip}`, 50],
      ] as const) {
        const rl = await rateLimit(key, limit, 15 * 60);
        if (!rl.ok) throw new Error(tooManyRequestsMessage(rl.retryAfter));
      }

      const table = { business: "business_owners", customer: "customers", admin: "admins" }[role];
      const row = await queryOne<{ id: number; name: string; email: string; password_hash: string | null; session_version: number }>(
        `SELECT id, name, email, password_hash, session_version FROM ${table} WHERE email = $1`,
        [email],
      );
      if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null;

      // 運営者は、二段階認証を設定していれば認証アプリの 6 桁も確認する（パスワードが漏れても入られない）
      if (role === "admin") {
        const tf = await queryOne<{ totp_secret: string | null; totp_enabled_at: string | null; totp_last_step: string | null }>(
          "SELECT totp_secret, totp_enabled_at, totp_last_step FROM admins WHERE id = $1",
          [row.id],
        );
        if (tf?.totp_enabled_at && tf.totp_secret) {
          if (!credentials?.otp) throw new Error("OTP_REQUIRED");
          const step = verifyTotp(tf.totp_secret, credentials.otp);
          // 同じ 6 桁の使い回し（盗み見・再送）も断る
          if (step === null || (tf.totp_last_step && step <= Number(tf.totp_last_step))) throw new Error("OTP_INVALID");
          await queryOne("UPDATE admins SET totp_last_step = $1 WHERE id = $2", [step, row.id]);
        }
        await notifyAdminLogin(row.email, ip);
      }
      await resetRateLimit(accountKey);
      return { id: String(row.id), name: row.name, email: row.email, role, sv: row.session_version };
    },
  }),
];

// Google OAuth は顧客ログイン専用
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const inserted = await queryOne<{ id: number }>(
        `INSERT INTO customers (name, email) VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [user.name ?? email.split("@")[0], email],
      );
      if (!inserted) {
        // 第三者が先にこのメールアドレスでパスワード登録していた場合（メール未確認）の乗っ取りを防ぐ：
        // Google で本人確認できたので、確認済みにし、未確認のまま付けられたパスワードと古いログインを無効にする
        await queryOne(
          `UPDATE customers SET password_hash = NULL, email_verified_at = now(), session_version = session_version + 1
            WHERE email = $1 AND email_verified_at IS NULL AND password_hash IS NOT NULL`,
          [email],
        );
      }
      if (inserted) {
        const bizId = Number(cookies().get("sagamap_ref")?.value);
        if (bizId) await recordReferral(inserted.id, bizId);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const row = await queryOne<{ id: number; session_version: number }>("SELECT id, session_version FROM customers WHERE email = $1", [
          token.email.toLowerCase(),
        ]);
        token.uid = row?.id;
        token.role = "customer";
        token.sv = row?.session_version ?? 0;
        return token;
      }
      if (user) {
        token.uid = Number(user.id);
        token.role = (user as { role?: Role }).role ?? "customer";
        token.impersonated = Boolean((user as { impersonated?: boolean }).impersonated);
        token.sv = (user as { sv?: number }).sv ?? 0;
        return token;
      }
      // ログイン後の確認：パスワード変更・「すべての端末からログアウト」・アカウント削除のあとは、古いログインを使えなくする
      if (token.uid && token.role) {
        const table = { business: "business_owners", customer: "customers", admin: "admins" }[token.role as Role];
        const row = await queryOne<{ session_version: number }>(`SELECT session_version FROM ${table} WHERE id = $1`, [token.uid]).catch(
          () => undefined,
        );
        // DB に一時的につながらないときは、ログインを切らずにそのまま（row === undefined）
        if (row === null || (row && row.session_version !== (token.sv ?? 0))) return { revoked: true };
      }
      return token;
    },
    async session({ session, token }) {
      if (token.revoked || !token.uid) return { ...session, user: undefined as unknown as typeof session.user };
      session.user.id = token.uid as number;
      session.user.role = token.role as Role;
      session.user.impersonated = Boolean(token.impersonated);
      return session;
    },
  },
};

/** 運営者がログインしたらメールで知らせる（身に覚えのないログインにすぐ気づけるように） */
async function notifyAdminLogin(email: string, ip: string) {
  if (!mailEnabled()) return;
  const at = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  await sendMail(
    email,
    "【佐賀観光マップ】管理画面にログインしました",
    `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
      <p>管理画面にログインがありました。</p>
      <ul><li>日時：${at}</li><li>接続元：${ip.replace(/[<>&"]/g, "")}</li></ul>
      <p style="color:#b45309">心当たりがない場合は、すぐにパスワードを変更し、二段階認証を設定してください。</p>${mailFooter()}</div>`,
  ).catch(() => undefined);
}
