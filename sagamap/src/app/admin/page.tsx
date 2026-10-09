"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { api } from "@/lib/fetcher";
import PasswordChangeForm from "@/components/PasswordChangeForm";

type Stats = {
  customers: number;
  customers_7d: number;
  owners: number;
  premium_owners: number;
  monthly_revenue: number;
  stores: number;
  active_coupons: number;
  coupon_uses_30d: number;
  referrals: number;
};
type Row = Record<string, string | number | boolean | null>;

const TABS = [
  { key: "overview", label: "概要" },
  { key: "owners", label: "事業者" },
  { key: "stores", label: "店舗" },
  { key: "customers", label: "顧客" },
  { key: "logs", label: "操作記録" },
  { key: "errors", label: "エラー" },
  { key: "admins", label: "運営者・設定" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
type ListKey = "owners" | "stores" | "customers" | "logs" | "errors";

const COLUMNS: Record<ListKey, [key: string, label: string][]> = {
  owners: [["name", "名前"], ["email", "メール"], ["plan", "プラン"], ["monthly_price", "月額"], ["store_count", "店舗"], ["referral_count", "紹介"], ["created_at", "登録日"]],
  stores: [["name", "店舗名"], ["category", "業種"], ["address", "住所"], ["owner_email", "事業者"], ["is_premium", "有料"], ["active_coupons", "クーポン"], ["view_count", "閲覧"], ["created_at", "登録日"]],
  customers: [["name", "名前"], ["email", "メール"], ["interests", "興味"], ["referred_by", "紹介元"], ["notify_enabled", "通知"], ["created_at", "登録日"]],
  logs: [["created_at", "日時"], ["admin_email", "運営者"], ["action", "操作"], ["target", "対象"], ["detail", "詳細"]],
  errors: [["created_at", "日時"], ["source", "発生場所"], ["message", "内容"], ["url", "URL"]],
};
const READ_ONLY: ListKey[] = ["logs", "errors"];

/** 運営者専用の管理画面 */
export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-xl font-bold">運営者管理画面</h1>
      <nav className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm ${tab === t.key ? "border-saga-600 font-semibold text-saga-700" : "border-transparent text-slate-500"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "overview" && <Overview />}
      {tab === "admins" && <Admins />}
      {tab !== "overview" && tab !== "admins" && <List key={tab} type={tab} />}
    </main>
  );
}

function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api<{ stats: Stats }>("/api/admin/overview").then((d) => setStats(d.stats));
  }, []);
  if (!stats) return <p className="text-sm text-slate-500">読み込み中…</p>;
  const tiles: [string, string, string?][] = [
    ["顧客", `${stats.customers.toLocaleString()} 人`, `直近 7 日 +${stats.customers_7d}`],
    ["事業者", `${stats.owners.toLocaleString()} 件`, `有料 ${stats.premium_owners} 件`],
    ["店舗", `${stats.stores.toLocaleString()} 店`],
    ["見込み月額売上", `${stats.monthly_revenue.toLocaleString()} 円`, "有料プランの月額合計"],
    ["配信中クーポン", `${stats.active_coupons.toLocaleString()} 件`],
    ["クーポン利用（30 日）", `${stats.coupon_uses_30d.toLocaleString()} 回`],
    ["紹介による登録", `${stats.referrals.toLocaleString()} 人`],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(([label, value, sub]) => (
        <div key={label} className="card">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

function List({ type }: { type: ListKey }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    (term: string) => api<{ rows: Row[] }>(`/api/admin/${type}?q=${encodeURIComponent(term)}`).then((d) => setRows(d.rows)),
    [type],
  );
  useEffect(() => {
    load("");
  }, [load]);

  async function remove(row: Row) {
    const label = String(row.email ?? row.name);
    if (!confirm(`「${label}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      await api(`/api/admin/${type}/${row.id}`, { method: "DELETE" });
      setMessage(`「${label}」を削除しました`);
      load(q);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function viewAs(row: Row) {
    const who = type === "owners" ? "事業主" : "お客さま";
    if (!confirm(`「${row.email}」の${who}画面を表示します。\n管理画面に戻るときは、もう一度管理者としてログインしてください。`)) return;
    try {
      const d = await api<{ token: string; role: string; redirect: string }>("/api/admin/impersonate", {
        method: "POST",
        body: JSON.stringify({ type, id: row.id }),
      });
      const res = await signIn("credentials", { impersonate: d.token, role: d.role, redirect: false });
      if (res?.error) throw new Error("画面を表示できませんでした");
      window.location.href = d.redirect;
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function resetLink(row: Row) {
    try {
      const d = await api<{ url: string; email: string }>("/api/admin/reset-link", {
        method: "POST",
        body: JSON.stringify({ type, id: row.id }),
      });
      await navigator.clipboard?.writeText(d.url).catch(() => undefined);
      setMessage(`${d.email} さん用のパスワード再設定リンク（24 時間有効・コピー済み）：${d.url}`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function changePlan(row: Row) {
    const next = row.plan === "premium" ? "free" : "premium";
    const text = next === "premium" ? "有料プランに変更" : "無料プランに戻す";
    if (!confirm(`「${row.email}」を${text}しますか？（Stripe の請求は変わりません）`)) return;
    try {
      await api(`/api/admin/owners/${row.id}`, { method: "PATCH", body: JSON.stringify({ plan: next }) });
      setMessage(`「${row.email}」を${text}しました`);
      load(q);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前・メールなどで検索" className="input max-w-xs py-1.5" />
        <button className="btn-outline py-1.5">検索</button>
        <a href={`/api/admin/export?type=${type}&q=${encodeURIComponent(q)}`} className="btn-primary ml-auto py-1.5">
          CSV で書き出し
        </a>
      </form>
      {message && <p className="break-all rounded-2xl bg-saga-50 px-3 py-2 text-sm font-bold text-saga-700">{message}</p>}
      {rows === null ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">データがありません。</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {COLUMNS[type].map(([, label]) => (
                  <th key={label} className="px-3 py-2 font-medium">
                    {label}
                  </th>
                ))}
                {!READ_ONLY.includes(type) && <th className="px-3 py-2 font-medium">操作</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t align-top">
                  {COLUMNS[type].map(([key]) => (
                    <td key={key} className="max-w-[16rem] break-words px-3 py-2">
                      {format(key, r[key])}
                    </td>
                  ))}
                  {!READ_ONLY.includes(type) && (
                    <td className="whitespace-nowrap px-3 py-2">
                      {(type === "owners" || type === "customers") && (
                        <>
                          <button onClick={() => viewAs(r)} className="mr-3 font-bold text-coral-600 underline">
                            画面を見る
                          </button>
                          <button onClick={() => resetLink(r)} className="mr-3 text-saga-600 underline">
                            再設定リンク
                          </button>
                        </>
                      )}
                      {type === "owners" && (
                        <button onClick={() => changePlan(r)} className="mr-3 text-saga-600 underline">
                          {r.plan === "premium" ? "無料にする" : "有料にする"}
                        </button>
                      )}
                      <button onClick={() => remove(r)} className="text-red-600 underline">
                        削除
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">最新 500 件まで表示しています。すべてのデータは CSV で書き出せます。</p>
    </div>
  );
}

function format(key: string, v: Row[string]) {
  if (v == null || v === "") return <span className="text-slate-400">—</span>;
  if (typeof v === "boolean") return v ? "◯" : "—";
  if (key === "plan") return v === "premium" ? <b className="text-saga-700">有料</b> : "無料";
  if (key === "monthly_price") return `${Number(v).toLocaleString()} 円`;
  if (key === "created_at") return new Date(String(v)).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" });
  return String(v);
}

function Admins() {
  const [admins, setAdmins] = useState<{ id: number; name: string; email: string; created_at: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(() => api<{ admins: typeof admins }>("/api/admin/admins").then((d) => setAdmins(d.admins)), []);
  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api("/api/admin/admins", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      setMessage("運営者を追加しました");
      form.reset();
      load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PasswordChangeForm minLength={12} />
      <section className="card space-y-2">
        <h2 className="font-extrabold">💾 データのバックアップ</h2>
        <p className="text-sm text-slate-600">
          全データを JSON ファイルで保存します。月に 1 回程度の保存をおすすめします（パスワードと写真は含みません）。
        </p>
        <a href="/api/admin/backup" className="btn-primary w-full">
          バックアップをダウンロード
        </a>
      </section>
      <ul className="card divide-y">
        {admins.map((a) => (
          <li key={a.id} className="py-2 text-sm">
            <b>{a.name}</b>　{a.email}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="card space-y-3">
        <h2 className="font-bold">運営者を追加</h2>
        <input name="name" required placeholder="名前" className="input" />
        <input name="email" type="email" required placeholder="メールアドレス" className="input" />
        <input name="password" type="password" required minLength={12} placeholder="パスワード（12 文字以上）" autoComplete="new-password" className="input" />
        {message && <p className="text-sm text-saga-700">{message}</p>}
        <button className="btn-primary w-full">追加する</button>
      </form>
    </div>
  );
}
