import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function unsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const rows = token
    ? await query("UPDATE customers SET notify_enabled = false WHERE unsubscribe_token = $1 RETURNING id", [token])
    : [];
  redirect(`/unsubscribe?done=${rows.length ? 1 : 0}`);
}

/**
 * メール配信停止: /unsubscribe?token=...
 * メールソフトのリンク先読みで誤って停止されないよう、ボタン押下（POST）で確定する。
 */
export default function UnsubscribePage({ searchParams }: { searchParams: { token?: string; done?: string } }) {
  if (searchParams.done !== undefined) {
    const ok = searchParams.done === "1";
    return (
      <main className="mx-auto max-w-md p-4 text-center">
        <h1 className="mt-8 text-xl font-bold">{ok ? "配信を停止しました" : "リンクが無効です"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {ok ? "SagaMap からの週 1 回のお知らせメールを停止しました。" : "URL をご確認のうえ、もう一度お試しください。"}
        </p>
        <Link href="/" className="btn-primary mt-6">
          地図に戻る
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md p-4 text-center">
      <h1 className="mt-8 text-xl font-bold">お知らせメールの配信停止</h1>
      <p className="mt-2 text-sm text-slate-600">週 1 回の新着クーポン・イベントのメールを停止しますか？</p>
      <form action={unsubscribe}>
        <input type="hidden" name="token" value={searchParams.token ?? ""} />
        <button className="btn-primary mt-6">配信を停止する</button>
      </form>
    </main>
  );
}
