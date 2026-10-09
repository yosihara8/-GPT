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
    },
    async authorize(credentials, req) {
      // 管理者の代理ログイン（管理画面で発行した 1 回限り・2 分間有効のトークン）
      if (credentials?.impersonate) {
        const target = await consumeToken("impersonate", credentials.impersonate);
        if (!target || target.role === "admin") return null;
        const table = target.role === "business" ? "business_owners" : "customers";
        const row = await queryOne<{ id: number; name: string; email: string }>(
          `SELECT id, name, email FROM ${table} WHERE id = $1`,
          [target.user_id],
        );
        return row ? { id: String(row.id), name: row.name, email: row.email, role: target.role, impersonated: true } : null;
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
      const row = await queryOne<{ id: number; name: string; email: string; password_hash: string | null }>(
        `SELECT id, name, email, password_hash FROM ${table} WHERE email = $1`,
        [email],
      );
      if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null;
      await resetRateLimit(accountKey);
      return { id: String(row.id), name: row.name, email: row.email, role };
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
      if (inserted) {
        const bizId = Number(cookies().get("sagamap_ref")?.value);
        if (bizId) await recordReferral(inserted.id, bizId);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const row = await queryOne<{ id: number }>("SELECT id FROM customers WHERE email = $1", [
          token.email.toLowerCase(),
        ]);
        token.uid = row?.id;
        token.role = "customer";
      } else if (user) {
        token.uid = Number(user.id);
        token.role = (user as { role?: Role }).role ?? "customer";
        token.impersonated = Boolean((user as { impersonated?: boolean }).impersonated);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as number;
      session.user.role = token.role as Role;
      session.user.impersonated = Boolean(token.impersonated);
      return session;
    },
  },
};
