import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { APP_URL } from "@/lib/config";
import { isCronRequest, jstDate, jstMonth, runOnce } from "@/lib/cron";
import { applyMonthlyReferralPricing } from "@/lib/referral";
import { runContentReview } from "@/lib/content-review";
import { backupAttachment } from "@/lib/backup";
import { buildMonthlyLedger } from "@/lib/ledger";
import { mailEnabled, mailFooter, sendMail } from "@/lib/mail";
import { logServerError } from "@/lib/server-error";
import { errorReportHtml, recentErrorGroups } from "@/lib/error-report";
import { sendOwnerReports } from "@/lib/owner-report";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 運営者への送り先（REPORT_EMAIL があればそれ、なければ運営者アカウントのメール） */
async function adminEmails() {
  const fixed = process.env.REPORT_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean);
  if (fixed?.length) return fixed;
  return (await query<{ email: string }>("SELECT email FROM admins ORDER BY id")).map((a) => a.email);
}

const wrap = (title: string, body: string) =>
  `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:16px">
    <p style="font-size:20px;font-weight:bold">佐賀観光マップ ${title}</p>${body}${mailFooter()}</div>`;

/** 毎日：エラー報告（エラーがなければ送らない） */
async function dailyErrorReport() {
  const groups = await recentErrorGroups(24);
  if (groups.length === 0) return { errors: 0 };
  const total = groups.reduce((n, g) => n + g.count, 0);
  for (const to of await adminEmails()) {
    await sendMail(to, `【佐賀観光マップ】エラー報告 ${jstDate()}（${total} 件）`, wrap("エラー報告", errorReportHtml(groups, `${APP_URL}/admin`)));
  }
  return { errors: total, kinds: groups.length };
}

/** 月 1 回：データベースのバックアップをメールで送る */
async function monthlyBackup() {
  const { filename, content, counts } = await backupAttachment();
  const list = Object.entries(counts).map(([k, v]) => `<li>${k}：${v} 件</li>`).join("");
  for (const to of await adminEmails()) {
    await sendMail(
      to,
      `【佐賀観光マップ】月次バックアップ（${jstDate()}）`,
      wrap(
        "月次バックアップ",
        `<p>データベースのバックアップを添付しました（${filename}）。</p>
         <p style="color:#b45309"><b>個人情報を含みます。</b>ダウンロードしたら安全な場所（パスワード付きのフォルダ等）に保管し、このメールは削除してください。パスワードやログイン用の情報は含まれていません。</p>
         <ul style="font-size:13px">${list}</ul>
         <p style="font-size:13px">手動でのバックアップは <a href="${APP_URL}/admin">管理画面</a> からも取れます。</p>`,
      ),
      [{ filename, content }],
    );
  }
  return { filename, counts };
}

/** 月 1 回：前月の帳簿（Excel）をメールで送る */
async function monthlyLedger() {
  const ledger = await buildMonthlyLedger();
  const s = ledger.summary;
  for (const to of await adminEmails()) {
    await sendMail(
      to,
      `【佐賀観光マップ】${ledger.label} の帳簿`,
      wrap(
        `${ledger.label} の帳簿`,
        `<p>${ledger.label} の帳簿（Excel）を添付しました。</p>
         <ul>
           <li>売上：${s.sales.toLocaleString()} 円（税込）</li>
           <li>返金：${s.refunds.toLocaleString()} 円</li>
           <li>Stripe 手数料：${s.fees.toLocaleString()} 円</li>
         </ul>
         ${s.stripeReady ? "" : "<p>※ Stripe が未設定のため、売上データはまだありません。</p>"}
         <p style="font-size:13px">サーバー代などの経費は「経費（手入力）」シートに入力してください。確定申告の際は、このファイルを会計ソフトや税理士さんに渡せます。</p>`,
      ),
      [{ filename: ledger.filename, content: ledger.content }],
    );
  }
  return { label: ledger.label, ...s };
}

/**
 * 毎日の自動処理（Vercel Cron が毎日 0:10 日本時間に呼び出す）。
 *  - 毎日：クーポン・広告の掲載チェック
 *  - 毎月 1 回：紹介割引の判定、データベースのバックアップ、前月の帳簿をメール送信、事業主への月次レポート
 * どれかが失敗しても他は実行し、失敗したものは翌日に再実行する。
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const month = jstMonth();
  const tasks: Record<string, () => Promise<unknown>> = {
    referrals: () => runOnce("monthly-referrals", month, applyMonthlyReferralPricing),
    contentReview: () => runOnce("content-review", jstDate(), runContentReview),
    // 古いデータの片付け（読んだお知らせは 30 日、読んでいないものも 90 日で消す。行動の記録は 1 年）
    cleanup: async () => ({
      notifications: (
        await query(
          "DELETE FROM notifications WHERE (read_at IS NOT NULL AND read_at < now() - interval '30 days') OR created_at < now() - interval '90 days' RETURNING 1",
        )
      ).length,
      shopEvents: (await query("DELETE FROM shop_events WHERE created_at < now() - interval '400 days' RETURNING 1")).length,
    }),
    // メールが使えない間は実行しない（設定後の最初の実行で送る）
    backup: async () => (mailEnabled() ? runOnce("monthly-backup", month, monthlyBackup) : { skipped: "メール未設定" }),
    // 毎月 1 日：事業主に先月のレポートメール（お店に来ようとしたお客さまの数・次にやること）
    ownerReport: async () =>
      mailEnabled() ? runOnce("monthly-owner-report", month, () => sendOwnerReports((to, subject, html) => sendMail(to, subject, html))) : { skipped: "メール未設定" },
    ledger: async () => (mailEnabled() ? runOnce("monthly-ledger", month, monthlyLedger) : { skipped: "メール未設定" }),
    // 毎日：直近 24 時間のエラーをまとめて運営者へ（自動保守の Claude がこのメールを読んで修正する）
    errorReport: async () => (mailEnabled() ? runOnce("daily-error-report", jstDate(), dailyErrorReport) : { skipped: "メール未設定" }),
  };
  const results: Record<string, unknown> = {};
  for (const [name, run] of Object.entries(tasks)) {
    try {
      results[name] = await run();
    } catch (e) {
      await logServerError(`cron/daily:${name}`, e);
      results[name] = { error: (e as Error).message };
    }
  }
  return NextResponse.json(results);
}
