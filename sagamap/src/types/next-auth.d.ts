import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: number; role: "business" | "customer" };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: number;
    role?: "business" | "customer";
  }
}
