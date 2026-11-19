/* ミセカン 給与計算・源泉徴収の計算
 * 注意：税率・控除額は設定（settings.tax）で変えられるようにしています。
 * 初期値は「月額表の甲欄を適用する給与等に対する源泉徴収税額の電算機計算の特例」（令和2年〜令和7年分）の数値です。
 * 令和8年分以降は国税庁の最新の税額表で必ず確認し、設定を更新してください。
 */
'use strict';
(function () {
  const U = App.U;

  App.defaultTax = () => ({
    version: '令和2〜7年分の電算機計算の特例（令和8年分は要確認）',
    zeroBelow: 88000,              // 甲欄：社会保険料等控除後の金額がこれ未満なら0円
    kyuyo: [                       // 給与所得控除（月額）[上限, 率, 加算]（率が null なら固定額）
      [135416, null, 45834], [149999, 0.4, -8333], [299999, 0.3, 6667],
      [549999, 0.2, 36667], [708330, 0.1, 91667], [Infinity, null, 162500]],
    kiso: 40000,                   // 基礎控除（月額）
    fuyo: 31667,                   // 配偶者（特別）控除・扶養控除 1人あたり（月額）
    brackets: [                    // 税率（復興特別所得税込み）[上限, 率, 控除]
      [162500, 0.05105, 0], [275000, 0.1021, 8296], [579166, 0.2042, 36374],
      [750000, 0.23483, 54113], [1500000, 0.33693, 130688], [3333333, 0.4084, 237893], [Infinity, 0.45945, 408061]],
    otsuBelow: 105000,             // 乙欄：この金額未満は一律の率
    otsuRate: 0.03063,
  });

  const Pay = App.Pay = {};

  /* 1日分の勤務時間（分） */
  Pay.day = function (p) {
    if (!p || !p.in || !p.out) return null;
    const a = U.toMin(p.in); let b = U.toMin(p.out); if (b <= a) b += 1440;
    const brk = p.breakMin || 0;
    const work = Math.max(0, b - a - brk);
    // 深夜（22:00〜翌5:00）。休憩は深夜帯に取らない前提の簡易計算
    const night = Math.min(work, U.overlap(a, b, 22 * 60, 29 * 60) + U.overlap(a, b, 0, 5 * 60));
    const ot = Math.max(0, work - 8 * 60);   // 1日8時間を超えた分
    return { work, night, ot };
  };

  /* 源泉所得税（月額） */
  Pay.incomeTax = function (A, dependents, col, tax) {
    A = Math.max(0, Math.floor(A));
    if (col === '乙') {
      if (A < tax.otsuBelow) return { tax: Math.floor(A * tax.otsuRate), note: '' };
      return { tax: Math.floor(A * tax.otsuRate), note: '乙欄で10万5千円以上は税額表で確認が必要です（試作では一律率で概算）' };
    }
    if (A < tax.zeroBelow) return { tax: 0, note: '' };
    const lim = r => (r[0] === null || r[0] === undefined) ? Infinity : r[0];  // 保存時に Infinity は null になる
    const k = tax.kyuyo.find(r => A <= lim(r));
    const kyuyo = k[1] === null ? k[2] : Math.ceil(A * k[1] + k[2]);
    const B = Math.max(0, A - kyuyo - tax.kiso - tax.fuyo * (dependents || 0));
    const br = tax.brackets.find(r => B <= lim(r));
    const t = Math.max(0, Math.round((B * br[1] - br[2]) / 10) * 10);
    return { tax: t, note: '' };
  };

  /* 雇用保険料：50銭以下切り捨て、50銭超切り上げ */
  Pay.roundIns = x => { const f = Math.floor(x); return x - f > 0.5 ? f + 1 : f; };

  /* 1か月分の給与 */
  Pay.month = function (staff, ym, data) {
    const s = data.settings;
    const recs = data.punches.filter(p => p.staffId === staff.id && p.date.startsWith(ym) && p.in && p.out);
    let work = 0, night = 0, ot = 0;
    recs.forEach(p => { const d = Pay.day(p); work += d.work; night += d.night; ot += d.ot; });
    const wage = staff.wage;
    const base = Math.round(wage * work / 60);
    const otPay = Math.round(wage * (s.otRate - 1) * ot / 60);
    const nightPay = Math.round(wage * (s.nightRate - 1) * night / 60);
    const transport = (staff.transport || 0) * recs.length;
    const gross = base + otPay + nightPay + transport;
    const taxable = gross - transport;                 // 通勤手当は非課税として扱う
    const empIns = staff.empIns ? Pay.roundIns(gross * s.empInsRate) : 0;
    const social = staff.socialIns || 0;
    const it = Pay.incomeTax(taxable - empIns - social, staff.dependents, staff.taxCol, s.tax);
    const deductions = empIns + social + it.tax;
    return {
      ym, staffId: staff.id, name: staff.name, wage, days: recs.length,
      workMin: work, otMin: ot, nightMin: night, base, otPay, nightPay, transport,
      gross, taxable, empIns, social, tax: it.tax, taxNote: it.note, deductions, net: gross - deductions,
      openDays: data.punches.filter(p => p.staffId === staff.id && p.date.startsWith(ym) && p.in && !p.out).length,
    };
  };

  /* 年間の給与所得控除（令和7年分以降の改正後の式。年末調整の表とは端数処理が異なる概算） */
  Pay.annualKyuyo = function (pay) {
    if (pay <= 1900000) return Math.min(pay, 650000);
    if (pay <= 3600000) return Math.floor(pay * 0.3 + 80000);
    if (pay <= 6600000) return Math.floor(pay * 0.2 + 440000);
    if (pay <= 8500000) return Math.floor(pay * 0.1 + 1100000);
    return 1950000;
  };
})();
