import nextVitals from "eslint-config-next/core-web-vitals";

// Next.js 16 から `next lint` がなくなったため、ESLint を直接使う（設定は Next の推奨のまま）
const config = [
  ...nextVitals,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "tsconfig.tsbuildinfo"] },
  {
    // React Compiler 向けの新しい規則（Next 16 で追加）。このアプリは React Compiler を使わないため、更新前と同じ規則に保つ
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default config;
