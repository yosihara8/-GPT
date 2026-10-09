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
export default function VerifyEmailPage({ searchParams }: { searchParams: { token?: string; done?: string } }) {
  if (searchParams.done !== undefined) {
    const ok = searchParams.done === "1";
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="text-5xl">{ok ? "✅" : "⚠️"}</p>
        <h1 className="mt-4 text-xl font-extrabold">{ok ? "メールアドレスを確認しました" : "リンクが無効か、期限切れです"}</h1>
        <p className="mt-2 text-sm text-slate-600">{ok ? "ご協力ありがとうございます。" : "マイページから確認メールを再送できます。"}</p>
        <Link href="/" className="btn-primary mt-6">
          地図に戻る
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <p className="text-5xl">📧</p>
      <h1 className="mt-4 text-xl font-extrabold">メールアドレスの確認</h1>
      <form action={verify}>
        <input type="hidden" name="token" value={searchParams.token ?? ""} />
        <button className="btn-primary mt-6">確認を完了する</button>
      </form>
    </main>
  );
}
