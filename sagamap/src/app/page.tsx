import type { Metadata } from "next";
import HomeApp from "@/components/customer/HomeApp";
import WelcomeView from "@/components/public/WelcomeView";
import { getSessionUser } from "@/lib/session";
import { getAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "佐賀観光マップ｜佐賀の観光・グルメ・カフェ・温泉をクーポンつきでさがせる地図" },
  description: "佐賀観光のお店さがしに。佐賀グルメ・ランチ・カフェ・佐賀牛・呼子のいか・嬉野温泉・武雄温泉・有田焼・お土産のお店を地図でさがして、会員登録（無料）でお得なクーポンや行き方の案内が使えます。",
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
