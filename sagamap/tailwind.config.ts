import type { Config } from "tailwindcss";

/**
 * SagaMap のカラーテーマ（モダンな地図アプリ調。色数を絞り、装飾を抑える）
 *  saga  … ブランドカラー（嬉野茶の深い緑。主要ボタン・選択中・リンク）
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
          50: "#eef5f2",
          100: "#d7e8e0",
          300: "#8dbca9",
          500: "#2f6f5c",
          600: "#1f4d3f",
          700: "#183d32",
          900: "#0f2a22",
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
        cream: "#f6f7f6",
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
