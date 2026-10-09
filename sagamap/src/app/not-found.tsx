import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <p className="text-5xl">🗺️❓</p>
      <h1 className="mt-4 text-xl font-extrabold">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-slate-600">URL が変わったか、削除された可能性があります。</p>
      <Link href="/" className="btn-primary mt-6">
        地図に戻る
      </Link>
    </main>
  );
}
