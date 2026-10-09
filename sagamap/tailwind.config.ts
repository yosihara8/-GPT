import type { Config } from "tailwindcss";

/**
 * SagaMap のカラーテーマ（佐賀の観光モチーフ）
 *  saga  … 有田焼の藍（リンク・アクセント）
 *  coral … バルーンフェスタの気球（主要ボタン）
 *  sun   … 有明海の夕日（ハイライト）
 *  tea   … 嬉野茶の緑（成功・安心）
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', '"Hiragino Maru Gothic ProN"', '"Hiragino Sans"', '"Noto Sans JP"', "sans-serif"],
      },
      colors: {
        saga: {
          50: "#eef4ff",
          100: "#dbe7ff",
          300: "#8fb3ff",
          500: "#3b6cf0",
          600: "#2453d6",
          700: "#1c41aa",
          900: "#132a66",
        },
        coral: {
          50: "#fff2ee",
          100: "#ffe1d8",
          400: "#ff8a6b",
          500: "#ff6b4a",
          600: "#ef4f2d",
          700: "#c63b1e",
        },
        sun: { 100: "#fff5d1", 300: "#ffd75e", 400: "#fbbf24", 500: "#f59e0b" },
        tea: { 50: "#eefaf0", 100: "#d6f2dc", 500: "#3fa34d", 600: "#2f8a3c", 700: "#23692e" },
        cream: "#fffaf2",
        coupon: "#e5484d",
        shop: "#3b82f6",
      },
      boxShadow: {
        pop: "0 6px 0 0 rgba(19,42,102,0.08), 0 10px 24px -8px rgba(19,42,102,0.18)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: { float: "float 4s ease-in-out infinite" },
    },
  },
  plugins: [],
};

export default config;
