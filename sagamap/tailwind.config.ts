import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        saga: {
          50: "#eef7f6",
          100: "#d5ece9",
          300: "#7cc4b8",
          500: "#1f8a7a",
          600: "#17705f",
          700: "#125a4d",
          900: "#0b3029",
        },
        coupon: "#e5484d",
        shop: "#3b82f6",
      },
    },
  },
  plugins: [],
};

export default config;
