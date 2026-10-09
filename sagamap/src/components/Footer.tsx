import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-white/60 bg-white/60 px-4 py-6 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p>🎈 SagaMap — 佐賀の個人事業主とお客さんを結ぶ、地理空間 AI 観光マップ</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/terms" className="hover:text-saga-700">利用規約</Link>
          <Link href="/privacy" className="hover:text-saga-700">プライバシーポリシー</Link>
          <Link href="/tokushoho" className="hover:text-saga-700">特定商取引法に基づく表記</Link>
          <Link href="/register/business" className="hover:text-saga-700">お店の方へ</Link>
        </nav>
      </div>
    </footer>
  );
}
