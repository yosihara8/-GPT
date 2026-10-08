// NEXT_PUBLIC_APP_URL が未設定なら、Vercel の本番ドメインを使う（独自ドメイン設定後はそちらに自動で切り替わる）
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(appUrl ? { env: { NEXT_PUBLIC_APP_URL: appUrl } } : {}),
};

export default nextConfig;
