import Link from "next/link";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500" aria-hidden><MapPinOff className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-bold">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-slate-600">URL が変わったか、削除された可能性があります。</p>
      <Link href="/" className="btn-primary mt-6">
        地図に戻る
      </Link>
    </main>
  );
}
