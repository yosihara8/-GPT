import type { Config } from "tailwindcss";

/**
 * SagaMap のカラーテーマ（モダンな地図アプリ調。色数を絞り、装飾を抑える）
 *  saga  … ブランドカラー（主要ボタン・選択中・リンク）。画面の種類ごとに globals.css の変数で切り替える
 *          お客さま＝深い緑 / 事業主＝青 / 管理者＝紫
 *  coral … クーポン・注意を引く赤系
 *  sun   … 注意・お知らせの琥珀色
 *  tea   … 成功・安心の緑
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", '"Noto Sans JP"', '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', "Meiryo", "sans-serif"],
      },
      colors: {
        saga: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
        coral: {
          50: "#fef3f2",
          100: "#fee4e2",
          400: "#f97066",
          500: "#e5483d",
          600: "#d92d20",
          700: "#b42318",
        },
        sun: { 100: "#fffaeb", 300: "#fedf89", 400: "#fdb022", 500: "#dc6803" },
        tea: { 50: "#ecfdf3", 100: "#dcfae6", 500: "#17b26a", 600: "#079455", 700: "#067647" },
        cream: "rgb(var(--page-bg) / <alpha-value>)",
        coupon: "#d92d20",
        shop: "#1f4d3f",
      },
      boxShadow: {
        pop: "0 1px 2px rgba(16,24,40,0.05), 0 4px 12px rgba(16,24,40,0.08)",
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
