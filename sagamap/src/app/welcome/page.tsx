import type { Metadata } from "next";
import { redirect } from "next/navigation";
import WelcomeView from "@/components/public/WelcomeView";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "佐賀観光マップ｜佐賀のカフェ・ランチ・宿をクーポンつきでさがせる地図",
  description: "佐賀のお店と、旅する人をつなぐ観光マップ。地図からお店をさがして、会員登録（無料）でお得なクーポンや行き方の案内が使えます。",
  // 登録前の方には、トップ（/）でこのページを出している。正規のアドレスはトップ
  alternates: { canonical: "/" },
};

/** 登録前のトップ（トップ / でも同じ内容を出している） */
export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user?.role === "customer") redirect("/");
  return <WelcomeView member={Boolean(user)} />;
}
