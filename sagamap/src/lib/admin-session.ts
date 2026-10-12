/**
 * 運営者（管理画面）専用のログイン情報。お客さま・事業主のログイン（NextAuth）とは別の Cookie にして、
 * 管理画面を完全に独立させる（お客さまとして試しても管理画面のログインは切れない／管理者のログインが公開画面に出ない）。
 * Edge（middleware）と Node の両方で使えるよう Web Crypto だけで署名する。
 */
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-sagamap-admin" : "sagamap-admin";
export const ADMIN_SESSION_HOURS = 12;

export type AdminClaims = { id: number; sv: number; exp: number };

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(`sagamap-admin:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signAdmin(claims: AdminClaims, secret: string) {
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

/** 署名と期限を確かめる（DB の確認は Node 側の getAdmin で行う） */
export async function verifyAdmin(token: string | undefined, secret: string): Promise<AdminClaims | null> {
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(body))) as AdminClaims;
    if (!Number.isInteger(claims.id) || typeof claims.exp !== "number" || claims.exp < Date.now() / 1000) return null;
    return claims;
  } catch {
    return null;
  }
}
