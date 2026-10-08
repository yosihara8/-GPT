import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import { APP_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "SagaMap｜佐賀の地理空間 AI 観光マップ", template: "%s｜SagaMap" },
  description: "佐賀の個人事業主とお客さんを結ぶ、地理空間 AI 観光マップ。近くのクーポン店舗を地図で見つけよう。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17705f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
