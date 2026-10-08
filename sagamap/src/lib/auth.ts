import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryOne } from "./db";
import { recordReferral } from "./referral";
import { AUTH_SECRET } from "./config";

export type Role = "business" | "customer";

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
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      const role = credentials?.role === "business" ? "business" : "customer";
      if (!email || !password) return null;

      const table = role === "business" ? "business_owners" : "customers";
      const row = await queryOne<{ id: number; name: string; email: string; password_hash: string | null }>(
        `SELECT id, name, email, password_hash FROM ${table} WHERE email = $1`,
        [email],
      );
      if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null;
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
  session: { strategy: "jwt" },
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
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as number;
      session.user.role = token.role as Role;
      return session;
    },
  },
};
