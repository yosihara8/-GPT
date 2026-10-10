import ExcelJS from "exceljs";
import type Stripe from "stripe";
import { query } from "./db";
import { OPERATOR } from "./config";
import { getStripe } from "./stripe";

/** 日本時間の「前月」の範囲（例: 2026-10-01 に実行 → 2026-09-01〜2026-09-30） */
export function previousMonthJst(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth(); // 今月（0 始まり）→ 前月は m-1
  const start = new Date(Date.UTC(y, m - 1, 1) - 9 * 3600 * 1000);
  const end = new Date(Date.UTC(y, m, 1) - 9 * 3600 * 1000);
  const label = new Date(start.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  return { start, end, label };
}

export type LedgerEntry = {
  date: Date;
  account: string;
  partner: string;
  memo: string;
  income: number;
  expense: number;
  ref: string;
};
export type Payout = { date: Date; amount: number; ref: string };

const jstDate = (unix: number) => new Date(unix * 1000);

/** Stripe の入出金（前月分）を帳簿の行にする */
async function stripeEntries(start: Date, end: Date) {
  const entries: LedgerEntry[] = [];
  const payouts: Payout[] = [];
  const owners = await query<{ stripe_customer_id: string; name: string; email: string }>(
    "SELECT stripe_customer_id, name, email FROM business_owners WHERE stripe_customer_id IS NOT NULL",
  );
  const byCustomer = new Map(owners.map((o) => [o.stripe_customer_id, `${o.name}（${o.email}）`]));
  const partnerOf = (tx: Stripe.BalanceTransaction) => {
    const src = tx.source && typeof tx.source === "object" ? (tx.source as Stripe.Charge | Stripe.Refund) : null;
    const charge = src && src.object === "refund" ? (typeof src.charge === "object" ? src.charge : null) : (src as Stripe.Charge | null);
    const customer = charge && typeof charge.customer === "string" ? charge.customer : null;
    return (customer && byCustomer.get(customer)) || charge?.billing_details?.email || charge?.receipt_email || "";
  };

  const stripe = getStripe();
  for await (const tx of stripe.balanceTransactions.list({
    created: { gte: Math.floor(start.getTime() / 1000), lt: Math.floor(end.getTime() / 1000) },
    limit: 100,
    expand: ["data.source"],
  })) {
    const date = jstDate(tx.created);
    if (tx.type === "payout") {
      payouts.push({ date, amount: -tx.amount, ref: tx.id });
      continue;
    }
    const partner = partnerOf(tx);
    if (tx.type === "charge" || tx.type === "payment") {
      entries.push({ date, account: "売上高", partner, memo: `${OPERATOR.serviceName} 有料プラン月額`, income: tx.amount, expense: 0, ref: tx.id });
    } else if (tx.type === "refund" || tx.type === "payment_refund") {
      entries.push({ date, account: "売上値引・返品", partner, memo: "返金", income: 0, expense: -tx.amount, ref: tx.id });
    } else if (tx.type === "stripe_fee") {
      entries.push({ date, account: "支払手数料", partner: "Stripe", memo: tx.description ?? "Stripe 利用料", income: 0, expense: -tx.amount, ref: tx.id });
      continue;
    } else if (tx.amount !== 0) {
      entries.push({
        date,
        account: tx.amount > 0 ? "雑収入" : "雑損失",
        partner: "Stripe",
        memo: tx.description ?? tx.type,
        income: Math.max(0, tx.amount),
        expense: Math.max(0, -tx.amount),
        ref: tx.id,
      });
    }
    if (tx.fee) {
      entries.push({ date, account: "支払手数料", partner: "Stripe", memo: "決済手数料", income: 0, expense: tx.fee, ref: tx.id });
    }
  }
  return { entries, payouts };
}

/** 月 1 回メールで送る帳簿（Excel） */
export async function buildMonthlyLedger(now = new Date()) {
  const { start, end, label } = previousMonthJst(now);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);
  const { entries, payouts } = stripeReady ? await stripeEntries(start, end) : { entries: [], payouts: [] };
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  const [plans] = await query<{ paid: number; special: number; expected: number }>(
    `SELECT count(*) FILTER (WHERE plan = 'premium' AND NOT complimentary)::int AS paid,
            count(*) FILTER (WHERE plan = 'premium' AND complimentary)::int AS special,
            coalesce(sum(monthly_price) FILTER (WHERE plan = 'premium' AND NOT complimentary), 0)::int AS expected
       FROM business_owners`,
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = OPERATOR.name;
  const yen = '#,##0"円"';
  const header = (ws: ExcelJS.Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F8A7A" } };
    row.alignment = { vertical: "middle" };
    row.height = 22;
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // 1. 月次サマリー
  const sum = wb.addWorksheet("月次サマリー");
  sum.columns = [
    { header: "項目", key: "k", width: 30 },
    { header: "金額・件数", key: "v", width: 18 },
    { header: "説明", key: "d", width: 60 },
  ];
  header(sum);
  const total = (account: string, field: "income" | "expense") => entries.filter((e) => e.account === account).reduce((s, e) => s + e[field], 0);
  const sales = total("売上高", "income");
  const refunds = total("売上値引・返品", "expense");
  const fees = total("支払手数料", "expense");
  const rows: [string, number | string | { formula: string }, string][] = [
    ["対象期間", label, `${OPERATOR.name}（${OPERATOR.serviceName}）`],
    ["売上高", sales, "Stripe で決済された有料プランの月額（税込）"],
    ["売上値引・返品", refunds, "返金した金額"],
    ["支払手数料（Stripe）", fees, "決済手数料など"],
    ["経費（手入力分）", { formula: "SUM('経費（手入力）'!E2:E100)" }, "「経費（手入力）」シートに入力した金額の合計"],
    ["差引（所得の目安）", { formula: "B3-B4-B5-B6" }, "売上 − 返金 − 手数料 − 経費"],
    ["銀行口座への入金", payouts.reduce((s, p) => s + p.amount, 0), "Stripe から振り込まれた金額（「入金」シート）"],
    ["有料プランの事業者（現在）", plans.paid, `月額の合計 ${plans.expected.toLocaleString()} 円`],
    ["特別プランの事業者（現在）", plans.special, "無料で有料機能を利用（売上なし）"],
  ];
  rows.forEach(([k, v, d]) => sum.addRow({ k, v, d }));
  for (let r = 3; r <= 8; r++) sum.getCell(`B${r}`).numFmt = yen;
  sum.getRow(7).font = { bold: true };
  sum.addRow({});
  sum.addRow({ k: "消費税", d: "インボイス未登録の免税事業者のため、消費税の区分はありません（金額はすべて税込）" });
  if (!stripeReady) sum.addRow({ k: "注意", d: "Stripe が未設定のため、売上データはありません" });

  // 2. 取引明細（売上帳・経費帳を兼ねる）
  const tx = wb.addWorksheet("取引明細");
  tx.columns = [
    { header: "日付", key: "date", width: 12, style: { numFmt: "yyyy/mm/dd" } },
    { header: "勘定科目", key: "account", width: 16 },
    { header: "取引先", key: "partner", width: 36 },
    { header: "摘要", key: "memo", width: 32 },
    { header: "収入", key: "income", width: 12, style: { numFmt: yen } },
    { header: "支出", key: "expense", width: 12, style: { numFmt: yen } },
    { header: "Stripe ID", key: "ref", width: 32 },
  ];
  header(tx);
  for (const e of entries) {
    tx.addRow({ ...e, date: new Date(e.date.getTime() + 9 * 3600 * 1000), income: e.income || null, expense: e.expense || null });
  }
  const last = tx.rowCount;
  const totalRow = tx.addRow(
    last >= 2
      ? { memo: "合計", income: { formula: `SUM(E2:E${last})` }, expense: { formula: `SUM(F2:F${last})` } }
      : { memo: "合計（この月の取引はありません）", income: 0, expense: 0 },
  );
  totalRow.font = { bold: true };

  // 3. 経費（手入力）
  const ex = wb.addWorksheet("経費（手入力）");
  ex.columns = [
    { header: "日付", key: "date", width: 12 },
    { header: "勘定科目", key: "account", width: 14 },
    { header: "支払先", key: "partner", width: 22 },
    { header: "摘要", key: "memo", width: 30 },
    { header: "金額", key: "amount", width: 12, style: { numFmt: yen } },
    { header: "支払方法", key: "method", width: 14 },
  ];
  header(ex);
  for (const [account, partner, memo] of [
    ["通信費", "Vercel", "サーバー利用料"],
    ["通信費", "（ドメイン会社）", "独自ドメイン"],
    ["通信費", "Resend", "メール送信"],
    ["地代家賃", "（バーチャルオフィス）", "住所利用料"],
    ["", "", ""],
  ]) {
    ex.addRow({ account, partner, memo, method: account ? "クレジットカード" : "" });
  }
  ex.addRow({});
  ex.addRow({ memo: "※ 金額は請求書・カード明細を見て入力してください" });

  // 4. 入金（Stripe → 銀行口座）
  const po = wb.addWorksheet("入金");
  po.columns = [
    { header: "日付", key: "date", width: 12, style: { numFmt: "yyyy/mm/dd" } },
    { header: "金額", key: "amount", width: 14, style: { numFmt: yen } },
    { header: "Stripe ID", key: "ref", width: 32 },
  ];
  header(po);
  for (const p of payouts) po.addRow({ ...p, date: new Date(p.date.getTime() + 9 * 3600 * 1000) });

  const content = Buffer.from(await wb.xlsx.writeBuffer());
  return {
    label,
    filename: `sagamap-ledger-${label}.xlsx`,
    content,
    summary: { sales, refunds, fees, payouts: payouts.length, entries: entries.length, stripeReady },
  };
}
