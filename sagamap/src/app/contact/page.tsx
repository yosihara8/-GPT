import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ContactForm from "@/components/ContactForm";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "お問い合わせ" };

/** お客さま・未登録の方のお問い合わせ */
export default async function ContactPage() {
  // 事業主は事業主の画面のお問い合わせへ（種類の選択肢が違う）
  const user = await getSessionUser();
  if (user?.role === "business" && !user.impersonated) redirect("/dashboard/business/contact");
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <div className="pt-2">
        <h1 className="font-mincho text-2xl font-bold">お問い合わせ</h1>
        <p className="mt-1 text-sm text-slate-600">使い方・クーポン・アカウントなど、お気軽にお問い合わせください。原則 3 営業日以内にメールでご返信します。</p>
      </div>
      <ContactForm role="customer" />
    </main>
  );
}
