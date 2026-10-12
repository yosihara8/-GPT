import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getAdmin } from "./admin-auth";
import { redirect } from "next/navigation";
import { authOptions, type Role } from "./auth";
import { queryOne } from "./db";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  // 無効にされたログイン（パスワード変更後の古い端末など）は、ログインしていない扱い
  if (!session?.user?.id || !session.user.role) return null;
  return session.user;
}

type ApiUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
type ApiAuth =
  | { ok: true; user: ApiUser }
  | { ok: false; response: NextResponse };

/** API Route 用: ログインと種別をチェックする */
export async function requireApiUser(role?: Role): Promise<ApiAuth> {
  // 運営者は管理画面専用のログイン（お客さま・事業主のログインとは別）
  if (role === "admin") {
    const admin = await getAdmin();
    if (!admin) return { ok: false, response: NextResponse.json({ error: "管理画面にログインしてください" }, { status: 401 }) };
    return { ok: true, user: { ...admin, impersonated: false } as unknown as ApiUser };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "会員登録・ログインが必要です" }, { status: 401 }) };
  }
  if (role && user.role !== role) {
    return { ok: false, response: NextResponse.json({ error: "この操作は許可されていません" }, { status: 403 }) };
  }
  return { ok: true, user };
}

/** ページ用: 未ログインならログイン画面へ */
export async function requirePageUser(role: Role, callbackUrl: string) {
  const user = await getSessionUser();
  if (!user || user.role !== role) {
    redirect(`/login?role=${role}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return user;
}

export async function getOwnerPlan(ownerId: number) {
  return queryOne<{
    plan: "free" | "premium";
    monthly_price: number;
    stripe_subscription_id: string | null;
    complimentary: boolean;
  }>(
    "SELECT plan, monthly_price, stripe_subscription_id, complimentary FROM business_owners WHERE id = $1",
    [ownerId],
  );
}

export function premiumRequired() {
  return NextResponse.json(
    { error: "この機能は有料プラン（月額 3,980 円）でご利用いただけます", upgradeUrl: "/upgrade" },
    { status: 402 },
  );
}

/** 指定店舗がログイン中の事業主の所有か */
export async function ownsBusiness(ownerId: number, businessId: number) {
  const row = await queryOne("SELECT 1 FROM businesses WHERE id = $1 AND owner_id = $2", [businessId, ownerId]);
  return Boolean(row);
}

/** アカウント設定の API 用：管理画面から（?as=admin）は運営者、それ以外はお客さま・事業主 */
export async function requireAccountUser(req: Request): Promise<ApiAuth> {
  return new URL(req.url).searchParams.get("as") === "admin" ? requireApiUser("admin") : requireApiUser();
}
