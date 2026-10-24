import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { getLang } from "@/lib/i18n-server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorReporter from "@/components/ErrorReporter";
import ThemeScope from "@/components/ThemeScope";
import SiteChrome from "@/components/SiteChrome";
import { APP_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  // 正規のアドレス（?ref= や ?next= 付きのアドレスを、同じページの重複として扱わせない）
  alternates: { canonical: "./" },
  title: { default: "佐賀観光マップ", template: "%s｜佐賀観光マップ" },
  description: "佐賀のお店と、旅する人をつなぐ観光マップ。近くのクーポン・おすすめのお店・宿や交通を地図で見つけよう。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E3A6E",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Shippori+Mincho+B1:wght@600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap"
        />
      </head>
      <body>
        <Providers lang={lang}>
          <ErrorReporter />
          <ThemeScope>
            <SiteChrome>
              <Header />
            </SiteChrome>
            <div className="flex-1">{children}</div>
            <SiteChrome footer>
              <Footer />
            </SiteChrome>
          </ThemeScope>
        </Providers>
      </body>
    </html>
  );
}
