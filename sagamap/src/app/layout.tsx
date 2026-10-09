import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorReporter from "@/components/ErrorReporter";
import { APP_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "SagaMap｜佐賀おでかけ AI マップ", template: "%s｜SagaMap" },
  description: "佐賀の個人事業主とお客さんを結ぶ、地理空間 AI 観光マップ。近くのクーポン店舗を地図で見つけよう。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff6b4a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <ErrorReporter />
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
