import { CircleAlert, CircleCheck, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { ACCOUNT_TABLE } from "@/lib/accounts";
import { consumeToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

async function verify(formData: FormData) {
  "use server";
  const owner = await consumeToken("verify_email", String(formData.get("token") ?? ""));
  if (owner && owner.role !== "admin") {
    await query(`UPDATE ${ACCOUNT_TABLE[owner.role]} SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1`, [
      owner.user_id,
    ]);
  }
  redirect(`/verify-email?done=${owner ? 1 : 0}`);
}

/** メールアドレスの確認（メールソフトのリンク先読みで確定しないよう、ボタンで確定） */
export default async function VerifyEmailPage(props: { searchParams: Promise<{ token?: string; done?: string }> }) {
  const searchParams = await props.searchParams;
  if (searchParams.done !== undefined) {
    const ok = searchParams.done === "1";
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        {ok ? <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tea-50 text-tea-600" aria-hidden><CircleCheck className="h-7 w-7" /></span> : <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-amber-700" aria-hidden><CircleAlert className="h-7 w-7" /></span>}
        <h1 className="mt-4 text-xl font-bold">{ok ? "メールアドレスを確認しました" : "リンクが無効か、期限切れです"}</h1>
        <p className="mt-2 text-sm text-slate-600">{ok ? "ご協力ありがとうございます。" : "マイページから確認メールを再送できます。"}</p>
        <Link href="/" className="btn-primary mt-6">
          地図に戻る
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-saga-50 text-saga-600" aria-hidden><Mail className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-bold">メールアドレスの確認</h1>
      <form action={verify}>
        <input type="hidden" name="token" value={searchParams.token ?? ""} />
        <button className="btn-primary mt-6">確認を完了する</button>
      </form>
    </main>
  );
}
