/* ミセカン 給与計算・労働時間・源泉徴収の計算（画面を持たない部品）
 *
 * 労働基準法などの決まりのうち、ここで計算しているもの
 *  - 32条  ：1日8時間・1週40時間を超えた分を時間外労働として数える（週は日曜はじまり。就業規則で決めた曜日に変えられる）
 *  - 34条  ：休憩は 労働時間が6時間を超えると45分以上、8時間を超えると60分以上（足りない日を知らせる）
 *  - 37条  ：時間外 25%以上、深夜（22時〜翌5時）25%以上、時間外が月60時間を超えた分は 50%以上
 *  - 24条  ：賃金は全額払い。法令で決まった控除（所得税・社会保険料・雇用保険料）以外は労使協定がないと引けない
 * 税・保険の数値は設定（settings）で変えられます。初期値は「要確認」の目印つきです。
 */
'use strict';
(function () {
  const U = App.U;

  App.defaultTax = () => ({
    version: '令和2〜7年分の電算機計算の特例（令和8年分は要確認）',
    zeroBelow: 88000,
    kyuyo: [[135416, null, 45834], [149999, 0.4, -8333], [299999, 0.3, 6667], [549999, 0.2, 36667], [708330, 0.1, 91667], [null, null, 162500]],
    kiso: 40000,
    fuyo: 31667,
    brackets: [[162500, 0.05105, 0], [275000, 0.1021, 8296], [579166, 0.2042, 36374], [750000, 0.23483, 54113], [1500000, 0.33693, 130688], [3333333, 0.4084, 237893], [null, 0.45945, 408061]],
    otsuBelow: 105000,
    otsuRate: 0.03063,
  });

  const Pay = App.Pay = {};
  const DAY_LIMIT = 8 * 60, WEEK_LIMIT = 40 * 60, M60 = 60 * 60;

  /* 1日分：実働・深夜・1日8時間超（分） */
  Pay.day = function (p) {
    if (!p || !p.in || !p.out) return null;
    const a = U.toMin(p.in); let b = U.toMin(p.out); if (b <= a) b += 1440;
    const brk = p.breakMin || 0;
    const work = Math.max(0, b - a - brk);
    // 深夜（22:00〜翌5:00）。休憩は深夜帯に取らない前提の簡易計算
    const night = Math.min(work, U.overlap(a, b, 22 * 60, 29 * 60) + U.overlap(a, b, 0, 5 * 60));
    return { work, night, otDay: Math.max(0, work - DAY_LIMIT), brk };
  };

  /* 34条：必要な休憩（分） */
  Pay.breakRequired = workPlusBreak => workPlusBreak > 8 * 60 ? 60 : workPlusBreak > 6 * 60 ? 45 : 0;
  Pay.breakShort = function (p) {
    const c = Pay.day(p); if (!c) return 0;
    // 休憩前の拘束時間ではなく「労働時間」で判定。休憩が足りないと労働時間が長くなるので、実働で判断する
    const need = c.work > 8 * 60 ? 60 : c.work > 6 * 60 ? 45 : 0;
    return Math.max(0, need - c.brk);
  };

  /* 1人の、ある期間の日ごとの時間（週40時間超を含む） */
  Pay.days = function (staffId, data, from, to) {
    const weekStart = data.settings.weekStart ?? 0;
    const back = (U.wd(from) - weekStart + 7) % 7;
    const start = U.addDays(from, -back);  // その週の初日から数える
    const byDate = {};
    data.punches.filter(p => p.staffId === staffId && p.date >= start && p.date <= to).forEach(p => { byDate[p.date] = p; });
    const out = {};
    let cum = 0;
    for (let d = start; d <= to; d = U.addDays(d, 1)) {
      if (U.wd(d) === weekStart) cum = 0;
      const c = Pay.day(byDate[d]);
      if (!c) continue;
      const regular = c.work - c.otDay;              // 1日8時間以内の部分
      const before = Math.max(0, cum - WEEK_LIMIT);
      cum += regular;
      const otWeek = Math.max(0, cum - WEEK_LIMIT) - before;   // この日に週40時間を超えた分
      if (d >= from) out[d] = { work: c.work, night: c.night, ot: c.otDay + otWeek, otWeek, brk: c.brk, punch: byDate[d] };
    }
    return out;
  };

  /* 源泉所得税（月額） */
  Pay.incomeTax = function (A, dependents, col, tax) {
    A = Math.max(0, Math.floor(A));
    const lim = r => (r[0] === null || r[0] === undefined) ? Infinity : r[0];
    if (col === '乙') {
      return { tax: Math.floor(A * tax.otsuRate), note: A < tax.otsuBelow ? '' : '乙欄で10万5千円以上は税額表で確認が必要です（試作では一律の率で概算）' };
    }
    if (A < tax.zeroBelow) return { tax: 0, note: '' };
    const k = tax.kyuyo.find(r => A <= lim(r));
    const kyuyo = k[1] === null ? k[2] : Math.ceil(A * k[1] + k[2]);
    const B = Math.max(0, A - kyuyo - tax.kiso - tax.fuyo * (dependents || 0));
    const br = tax.brackets.find(r => B <= lim(r));
    return { tax: Math.max(0, Math.round((B * br[1] - br[2]) / 10) * 10), note: '' };
  };

  /* 雇用保険料：50銭以下切り捨て、50銭超切り上げ（給与から引く場合の決まり） */
  Pay.roundIns = x => { const f = Math.floor(x); return x - f > 0.5 ? f + 1 : f; };

  /* 支給日（月末締め・翌月の給料日。31日などない日は月末） */
  Pay.payDate = function (ym, payDay) {
    const next = U.ymAdd(ym, 1), last = U.monthDays(next).length;
    return `${next}-${U.pad(Math.min(payDay, last))}`;
  };

  /* 1か月分の給与 */
  Pay.month = function (staff, ym, data) {
    const s = data.settings, days = U.monthDays(ym);
    const map = Pay.days(staff.id, data, days[0], days[days.length - 1]);
    const list = Object.values(map);
    const work = U.sum(list, x => x.work), night = U.sum(list, x => x.night), ot = U.sum(list, x => x.ot);
    const ot60 = Math.max(0, ot - M60);
    const wage = staff.wage;
    const base = Math.round(wage * work / 60);
    const otPay = Math.round(wage * (s.otRate - 1) * (ot - ot60) / 60 + wage * (s.ot60Rate - 1) * ot60 / 60);
    const nightPay = Math.round(wage * (s.nightRate - 1) * night / 60);
    const transport = (staff.transport || 0) * list.length;
    const gross = base + otPay + nightPay + transport;
    const taxable = gross - transport;                 // 通勤手当は非課税として扱う（上限内）
    const empIns = staff.empIns ? Pay.roundIns(gross * s.empInsRate) : 0;
    const social = staff.socialIns || 0;
    const it = Pay.incomeTax(taxable - empIns - social, staff.dependents, staff.taxCol, s.tax);
    const deductions = empIns + social + it.tax;
    return {
      ym, staffId: staff.id, name: staff.name, gender: staff.gender || '', wage, days: list.length,
      periodStart: days[0], periodEnd: days[days.length - 1], payDate: Pay.payDate(ym, s.payDay),
      workMin: work, otMin: ot, ot60Min: ot60, nightMin: night, base, otPay, nightPay, transport,
      gross, taxable, empIns, social, tax: it.tax, taxNote: it.note, deductions, net: gross - deductions,
      openDays: data.punches.filter(p => p.staffId === staff.id && p.date.startsWith(ym) && p.in && !p.out).length,
      storeName: s.storeName,
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
