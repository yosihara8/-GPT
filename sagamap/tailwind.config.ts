import type { Config } from "tailwindcss";

/**
 * 佐賀観光マップのカラーテーマ（観光の色：藍・朝焼け・柿右衛門・嬉野茶・黄金・白磁・墨）
 *  saga  … ブランドカラー（主要ボタン・選択中・リンク）。画面の種類ごとに globals.css の変数で切り替える
 *          お客さま＝藍 / 事業主＝深緑 / 管理者＝紫
 *  asa   … 朝焼け。いちばん押してほしいボタン（登録・経路・クーポンを出す）
 *  coral … 柿右衛門の赤。クーポン・割引
 *  sun   … 黄金。お知らせ・有料プラン
 *  tea   … 嬉野茶の緑。成功・安心
 *  slate … 墨をもとにした、少し温かみのある灰色
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', "Meiryo", "sans-serif"],
        mincho: ['"Shippori Mincho B1"', '"Hiragino Mincho ProN"', '"Yu Mincho"', "serif"],
        num: ["Outfit", '"Zen Kaku Gothic New"', "sans-serif"],
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
        slate: {
          50: "#F7F3EC",
          100: "#F0EBE2",
          200: "#E6DFD3",
          300: "#D3CBBE",
          400: "#A8A39A",
          500: "#7D7A74",
          600: "#5C5A57",
          700: "#42424A",
          800: "#2C2E37",
          900: "#1B1F2A",
          950: "#12141C",
        },
        asa: { 50: "#FDF0EA", 100: "#FBDCCD", 500: "#EE6A3A", 600: "#D9572A", 700: "#B54520" },
        coral: {
          50: "#FCF1EE",
          100: "#F8DFD9",
          400: "#DB6A57",
          500: "#C43D2B",
          600: "#B23626",
          700: "#8E2A1E",
        },
        sun: { 100: "#FBF3DF", 300: "#F0D290", 400: "#E3B04B", 500: "#B9832A" },
        // 水色（お客さまの画面の帯。透明感のある背景）
        mizu: { 50: "#F3F8F9", 100: "#E7F1F3", 200: "#D3E6EA" },
        tea: { 50: "#F2F5EA", 100: "#E3EBD3", 500: "#5F7F35", 600: "#4E6B2A", 700: "#3E5622" },
        cream: "rgb(var(--page-bg) / <alpha-value>)",
        coupon: "#C43D2B",
        shop: "#1E3A6E",
      },
      boxShadow: {
        pop: "0 1px 2px rgba(20,40,77,0.05), 0 6px 18px rgba(20,40,77,0.08)",
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
