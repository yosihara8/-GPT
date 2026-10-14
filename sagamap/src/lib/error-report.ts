import { query } from "./db";
import { escapeHtml } from "./escape";

/**
 * 毎日のエラー報告（運営者のメールへ。自動保守の Claude もこのメールを読んで修正する）。
 * 個人情報が混ざらないよう、メールアドレス・電話番号らしい数字・トークンは伏せる。
 */
export function redact(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[メール]")
    .replace(/\b0\d{1,4}-?\d{1,4}-?\d{3,4}\b/g, "[電話]")
    .replace(/\b(sk|pk|rk|whsec|re)_[A-Za-z0-9_]{8,}\b/g, "[キー]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[トークン]")
    .replace(/postgres(ql)?:\/\/\S+/g, "[DB 接続先]");
}

export type ErrorGroup = { source: string; where: string; message: string; count: number; first: string; last: string; stack: string | null };

/** 直近 24 時間のエラーを、同じ場所・同じ内容ごとにまとめる */
export async function recentErrorGroups(hours = 24) {
  const rows = await query<ErrorGroup>(
    `SELECT source, COALESCE(url, '') AS where, message, count(*)::int AS count,
            to_char(min(created_at) AT TIME ZONE 'Asia/Tokyo', 'MM/DD HH24:MI') AS first,
            to_char(max(created_at) AT TIME ZONE 'Asia/Tokyo', 'MM/DD HH24:MI') AS last,
            (array_agg(stack ORDER BY created_at DESC))[1] AS stack
       FROM error_logs WHERE created_at > now() - make_interval(hours => $1)
      GROUP BY source, COALESCE(url, ''), message ORDER BY count(*) DESC LIMIT 30`,
    [hours],
  );
  return rows.map((r) => ({
    ...r,
    where: redact(r.where).slice(0, 200),
    message: redact(r.message).slice(0, 500),
    stack: r.stack ? redact(r.stack.split("\n").slice(0, 8).join("\n")).slice(0, 1200) : null,
  }));
}

export function errorReportHtml(groups: ErrorGroup[], adminUrl: string) {
  const total = groups.reduce((n, g) => n + g.count, 0);
  const items = groups
    .map(
      (g) => `<div style="border:1px solid #eee;border-radius:8px;padding:10px;margin:8px 0">
        <p style="margin:0;font-size:13px"><b>${g.source === "browser" ? "画面（ブラウザ）" : "サーバー"}</b>・${escapeHtml(g.where)}・${g.count} 回（${g.first}〜${g.last}）</p>
        <p style="margin:6px 0;font-size:14px;font-weight:bold">${escapeHtml(g.message)}</p>
        ${g.stack ? `<pre style="white-space:pre-wrap;font-size:11px;color:#555;background:#f7f7f7;padding:8px;border-radius:6px">${escapeHtml(g.stack)}</pre>` : ""}
      </div>`,
    )
    .join("");
  return `<p>直近 24 時間に <b>${total} 件</b>（${groups.length} 種類）のエラーが記録されました。自動保守が内容を確認し、直せるものは修正します。</p>
    ${items}
    <p style="font-size:12px;color:#888">個人情報（メールアドレス・電話番号など）は伏せています。詳しくは <a href="${adminUrl}">管理画面の「エラー」</a> をご覧ください。</p>`;
}
