import type { Metadata } from "next";
import HomeApp from "@/components/customer/HomeApp";
import WelcomeView from "@/components/public/WelcomeView";
import { getSessionUser } from "@/lib/session";
import { getAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "佐賀観光マップ｜佐賀のカフェ・ランチ・宿をクーポンつきでさがせる地図" },
  description: "佐賀のお店と、旅する人をつなぐ観光マップ。地図からお店をさがして、会員登録（無料）でお得なクーポンや行き方の案内が使えます。",
};

/**
 * トップ。会員（お客さま・事業主）と、管理画面にログイン中の運営者には地図の画面。
 * 登録前の方には、同じアドレスのまま登録前のトップ（見るだけの地図・会員登録の案内）を出す。
 * （リダイレクト・書き換えを使わない。画面の中の移動や本番のサーバーで読み込みに失敗することがあったため）
 */
export default async function Home() {
  const user = await getSessionUser();
  if (user) return <HomeApp />;
  if (await getAdmin()) return <HomeApp />;
  return <WelcomeView member={false} />;
}
