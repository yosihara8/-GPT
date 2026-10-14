"use client";

import BizPage from "@/components/business/BizPage";
import {
  FREE_FEATURES,
  PREMIUM_FEATURES,
  SPECIAL_FEATURES,
} from "@/components/business/PlanParts";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { PAID_PLAN_TERMS } from "@/lib/contract-terms";
import { PRICE_DISCOUNT, PRICE_STANDARD, REFERRAL_GOAL } from "@/lib/config";

type PlanKey = "free" | "premium" | "special";
type Owner = {
  plan: "free" | "premium";
  monthly_price: number;
  complimentary?: boolean;
  plan_ends_at?: string | null;
};

export default function UpgradePage() {
  return (
    <Suspense>
      <Upgrade />
    </Suspense>
  );
}

function Upgrade() {
  const params = useSearchParams();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [selected, setSelected] = useState<PlanKey | null>(null);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const warnRef = useRef<HTMLElement>(null);

  const load = useCallback(
    () =>
      api<{ owner: Owner }>("/api/me").then((d) => {
        setOwner(d.owner);
        setSelected(d.owner.complimentary ? "special" : d.owner.plan);
      }),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const special = Boolean(owner?.complimentary);
  const current: PlanKey | null = owner
    ? special
      ? "special"
      : owner.plan
    : null;
  // 特別招待の方はお支払い 0 円のため、有料プランの金額は通常価格で表示する
  const price =
    owner && !special && owner.monthly_price > 0
      ? owner.monthly_price
      : PRICE_STANDARD;
  const leavingSpecial = special && selected !== null && selected !== "special";

  const options: {
    key: PlanKey;
    title: string;
    price: string;
    summary: string;
  }[] = [
    ...(special
      ? [
          {
            key: "special" as const,
            title: "特別招待プラン",
            price: "0 円・期限なし",
            summary: "有料プランのすべての機能をずっと無料で",
          },
        ]
      : []),
    {
      key: "free",
      title: "無料プラン",
      price: "0 円",
      summary: "お店の掲載・写真 3 枚・月次レポート",
    },
    {
      key: "premium",
      title: "有料プラン",
      price: `月額 ${price.toLocaleString()} 円（税込）`,
      summary:
        price === PRICE_DISCOUNT
          ? "紹介割引適用中・クーポン・広告・写真 20 枚"
          : "クーポン・広告・写真 20 枚・連携ボタン",
    },
  ];

  function pick(k: PlanKey) {
    setSelected(k);
    setAgree(false);
    setError(null);
    // 特別招待をやめる選択をしたら、注意文が必ず目に入るように画面を動かす
    if (special && k !== "special")
      setTimeout(
        () =>
          warnRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
  }

  async function toStripe(body: object = {}) {
    setLoading(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing", {
        method: "POST",
        body: JSON.stringify(body),
      });
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  async function confirmLeave() {
    if (!agree) return;
    const target = selected === "free" ? "無料プラン" : "有料プラン";
    if (
      !confirm(
        `特別招待プランをやめて${target}に変更します。\n\n一度変更すると、特別招待プランには二度と戻れません。本当によろしいですか？`,
      )
    )
      return;
    if (selected === "premium") return toStripe({ leaveSpecial: true });
    setLoading(true);
    setError(null);
    try {
      await api("/api/billing/leave-special", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      setDone(
        "無料プランに変更しました。有料プランはこのページからいつでも申し込めます。",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const features =
    selected === "special"
      ? SPECIAL_FEATURES
      : selected === "premium"
        ? PREMIUM_FEATURES
        : FREE_FEATURES;

  return (
    <BizPage
      eyebrow="PLAN"
      title="プランの変更"
      lead="使いたいプランをタッチして選んでください。お支払いは Stripe で安全に処理されます。"
    >
      {params.get("canceled") && (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          お手続きはキャンセルされました。プランは変わっていません。
        </p>
      )}
      {done && (
        <p className="rounded-2xl bg-tea-50 px-4 py-3 text-sm font-bold text-tea-700">
          {done}
        </p>
      )}

      {!owner ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label="プランを選ぶ"
            className={`grid gap-3 ${special ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            {options.map((o) => {
              const on = selected === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(o.key)}
                  className={`relative flex min-h-[96px] items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left transition active:scale-[0.99] ${
                    on
                      ? "border-saga-600 bg-saga-50/60 shadow-sm"
                      : "border-slate-200 hover:border-saga-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-saga-600 bg-saga-600 text-white" : "border-slate-300"}`}
                    aria-hidden
                  >
                    {on && <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-base font-bold">{o.title}</span>
                      {current === o.key && (
                        <span className="rounded-md bg-saga-600 px-2 py-0.5 text-[11px] font-bold text-white">
                          ご利用中
                        </span>
                      )}
                    </span>
                    <span className="num mt-0.5 block text-lg font-bold tracking-tight">
                      {o.price}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {o.summary}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {special && selected === "premium" && (
            <PaidPlanConfirm price={price} />
          )}
          {leavingSpecial && (
            <section
              ref={warnRef}
              role="alert"
              className="scroll-mt-24 space-y-3 rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-red-800"
            >
              <p className="flex items-center gap-2 text-lg font-bold text-red-700">
                <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
                ご注意ください：特別招待プランには戻れません
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm font-bold">
                <li>
                  特別招待プランは、一度ほかのプランに変更すると
                  <span className="underline decoration-2">
                    二度と戻すことはできません
                  </span>
                  。
                </li>
                <li>
                  運営者に頼んでも、同じ招待リンクを使っても、元には戻りません。
                </li>
                {selected === "free" ? (
                  <li>
                    無料プランになると、クーポン・広告・4
                    枚目以降の写真などの有料機能はすぐに使えなくなります。
                  </li>
                ) : (
                  <li>
                    有料プランは月額 {price.toLocaleString()}{" "}
                    円（税込）のお支払いが始まります。お支払いが完了した時点で特別招待プランは終了します。
                  </li>
                )}
                <li>
                  今のまま特別招待プランを続ける場合は、上の「特別招待プラン」を選んだままにしてください。
                </li>
              </ul>
              <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-red-800 ring-1 ring-red-200">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
                />
                特別招待プランに戻れないことを理解しました
              </label>
              <button
                type="button"
                onClick={confirmLeave}
                disabled={!agree || loading}
                className="btn btn-lg bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-40"
              >
                {loading
                  ? "手続き中…"
                  : selected === "free"
                    ? "無料プランに変更する（戻れません）"
                    : "有料プランを申し込む（戻れません）"}
              </button>
            </section>
          )}

          <section className="card space-y-2">
            <h2 className="text-sm font-bold text-slate-600">
              {options.find((o) => o.key === selected)?.title}でできること
            </h2>
            <ul className="space-y-1.5 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-saga-600"
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
            {selected === "premium" && price !== PRICE_DISCOUNT && (
              <p className="text-xs font-bold text-saga-700">
                月 {REFERRAL_GOAL} 名の紹介で翌月{" "}
                {PRICE_DISCOUNT.toLocaleString()} 円になります
              </p>
            )}
          </section>

          {!special && owner?.plan === "free" && selected === "premium" && (
            <PaidPlanConfirm price={price} />
          )}
          {!special && owner && (
            <Action
              owner={owner}
              selected={selected}
              price={price}
              loading={loading}
              onStripe={() => toStripe()}
            />
          )}
          {special && selected === "special" && (
            <p className="rounded-2xl bg-tea-50 px-4 py-3 text-sm font-bold text-tea-700">
              特別招待プランをご利用中です。有料プランのすべての機能を、お支払いなし・期限なしでお使いいただけます。
            </p>
          )}
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}
        </>
      )}
    </BizPage>
  );
}

/** 無料プラン・有料プランの方の手続きボタン */
function Action({
  owner,
  selected,
  price,
  loading,
  onStripe,
}: {
  owner: Owner;
  selected: PlanKey | null;
  price: number;
  loading: boolean;
  onStripe: () => void;
}) {
  const endsAt = owner.plan_ends_at
    ? new Date(owner.plan_ends_at).toLocaleDateString("ja-JP")
    : null;
  const label = loading ? "Stripe に移動中…" : null;

  if (owner.plan === "free") {
    if (selected !== "premium")
      return (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          無料プランをご利用中です。有料プランを選ぶと申し込みに進めます。
        </p>
      );
    return (
      <button
        onClick={onStripe}
        disabled={loading}
        className="btn-accent btn-lg"
      >
        {label ?? `有料プランに申し込む（月額 ${price.toLocaleString()} 円）`}
      </button>
    );
  }
  // 有料プラン中
  if (selected === "free") {
    return (
      <div className="space-y-3 rounded-2xl border-2 border-coral-100 bg-coral-50 p-4 text-sm text-coral-700">
        <p className="font-bold">無料プランに変更する（解約）</p>
        <p>
          Stripe
          の画面で「プランをキャンセル」を押すと解約になります。お支払い済みの期間の最終日までは有料プランのまま使え、その翌日から無料プランになります。
        </p>
        {endsAt && (
          <p className="font-bold">
            解約の手続きは済んでいます（{endsAt} まで有料プラン）。
          </p>
        )}
        <button
          onClick={onStripe}
          disabled={loading}
          className="btn-outline btn-lg"
        >
          {label ?? "解約の手続きへ（Stripe）"}
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {endsAt && (
        <p className="rounded-2xl bg-coral-50 px-4 py-3 text-sm text-coral-700">
          解約の手続きが済んでいます。<b>{endsAt}</b>{" "}
          まではお支払い済みのため、有料プランをそのまま使えます。続ける場合は、下のボタンから解約を取り消せます。
        </p>
      )}
      <button
        onClick={onStripe}
        disabled={loading}
        className="btn-primary btn-lg"
      >
        {label ??
          (endsAt
            ? "解約を取り消す（Stripe）"
            : "お支払い方法の変更（Stripe）")}
      </button>
    </div>
  );
}

/** 申し込み直前の最終確認（特定商取引法：料金・支払時期・提供時期・自動更新・解約・返金を申し込みボタンの前に表示） */
function PaidPlanConfirm({ price }: { price: number }) {
  const T = PAID_PLAN_TERMS;
  const rows: [string, string][] = [
    ["料金", `月額 ${price.toLocaleString()} 円（税込）。${T.extraCost}`],
    ["お支払い", `${T.payment}。${T.paymentTiming}`],
    ["ご利用開始", T.delivery],
    ["自動更新", `${T.renewal}。${T.cancelDeadline}`],
    ["解約", `${T.cancelHow}。${T.afterCancel}`],
    ["返金", T.refund],
  ];
  return (
    <section
      aria-label="お申し込み内容の確認"
      className="card space-y-2 border-saga-600/40"
    >
      <h2 className="font-bold">お申し込み内容の確認</h2>
      <dl className="divide-y divide-slate-100 text-xs leading-5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[4.5rem_1fr] gap-2 py-2">
            <dt className="font-bold text-slate-700">{k}</dt>
            <dd className="text-slate-600">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        お申し込みの前に
        <Link
          href="/terms"
          target="_blank"
          className="mx-0.5 font-bold text-saga-700 underline"
        >
          利用規約
        </Link>
        ・
        <Link
          href="/tokushoho"
          target="_blank"
          className="mx-0.5 font-bold text-saga-700 underline"
        >
          特定商取引法に基づく表記
        </Link>
        ・
        <Link
          href="/privacy"
          target="_blank"
          className="mx-0.5 font-bold text-saga-700 underline"
        >
          プライバシーポリシー
        </Link>
        をご確認ください。申し込みボタンを押すと、Stripe
        のお支払い画面に移ります。
      </p>
    </section>
  );
}
