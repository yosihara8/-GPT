/* ミセカン 管理者ページ：法令チェック
 * データを見て、法律上の対応が必要なところを自動で見つけます。
 * ここに出ないから問題がない、とは限りません。最終的な判断は社会保険労務士・税理士に確認してください。
 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;

  const Legal = App.Legal = {};
  Legal.issues = function (d) {
    const s = d.settings, today = U.today(), ym = U.ym(today), out = [];
    const add = (level, title, detail, law, tab) => out.push({ level, title, detail, law, tab });
    const active = d.staff.filter(x => x.active);
    const months = [U.ymAdd(ym, -1), ym];

    // 最低賃金
    active.filter(x => x.wage < s.minWage).forEach(x => add('bad', `${x.name} さんの時給が最低賃金より低い`, `時給 ${U.yen(x.wage)} ／ ${s.minWagePref}の最低賃金 ${U.yen(s.minWage)}`, '最低賃金法4条', 'staff'));

    // 休憩
    d.punches.filter(p => months.includes(U.ym(p.date)) && App.Pay.breakShort(p)).forEach(p => {
      add('bad', `${S.staff(p.staffId)?.name} さん ${U.label(p.date)} の休憩が${App.Pay.breakShort(p)}分足りない`, `${p.in}〜${p.out} 休憩${p.breakMin}分`, '労働基準法34条', 'attendance');
    });

    // 時間外・36協定・年少者
    active.forEach(x => {
      months.forEach(m => {
        const md = U.monthDays(m);
        const dm = Object.entries(App.Pay.days(x.id, d, md[0], md[md.length - 1]));
        const ot = U.sum(dm, ([, v]) => v.ot);
        if (ot > 0 && !s.agreement36) add('bad', `${x.name} さん ${U.ymLabel(m)}に時間外労働 ${U.hm(ot)}（36協定なし）`, '36協定を届け出ていないと、1日8時間・週40時間を超えて働かせることはできません。', '労働基準法32条・36条', 'attendance');
        else if (ot > s.limitMonth * 60) add('bad', `${x.name} さん ${U.ymLabel(m)}の時間外労働 ${U.hm(ot)} が36協定の上限（月${s.limitMonth}時間）を超えている`, '', '労働基準法36条', 'attendance');
        else if (ot > s.limitMonth * 60 * 0.8) add('warn', `${x.name} さん ${U.ymLabel(m)}の時間外労働 ${U.hm(ot)}（上限の8割を超えた）`, '', '労働基準法36条', 'attendance');
        dm.forEach(([date, v]) => {
          const age = U.age(x.birth, date);
          if (age !== null && age < 18 && (v.night > 0 || v.ot > 0)) add('bad', `${x.name} さん（${age}歳）${U.label(date)} に${v.night ? '深夜（22時以降）' : ''}${v.night && v.ot ? 'と' : ''}${v.ot ? '時間外' : ''}の労働`, '18歳未満は、原則として深夜（22時〜翌5時）と時間外の労働ができません。', '労働基準法60条・61条', 'attendance');
        });
      });
      const y = today.slice(0, 4);
      const yOt = U.sum(Object.values(App.Pay.days(x.id, d, `${y}-01-01`, today)), v => v.ot);
      if (s.agreement36 && yOt > s.limitYear * 60) add('bad', `${x.name} さん ${y}年の時間外労働 ${U.hm(yOt)} が年の上限（${s.limitYear}時間）を超えている`, '1月1日から数えた概算です。36協定の起算日で確認してください。', '労働基準法36条', 'attendance');
      // 18歳未満の深夜シフト（予定）
      d.shifts.filter(sh => sh.staffId === x.id && sh.date >= today && U.toMin(sh.end) > 22 * 60).forEach(sh => {
        const age = U.age(x.birth, sh.date);
        if (age !== null && age < 18) add('bad', `${x.name} さん（${age}歳）${U.label(sh.date)} のシフトが22時を超えている`, `${sh.start}〜${sh.end}`, '労働基準法61条', 'shift');
      });
      // 労働者名簿の記入
      const need = [['name', '氏名'], ['gender', '性別'], ['birth', '生年月日'], ['address', '住所'], ['hireDate', '雇入れ年月日']].filter(([k]) => !x[k]).map(([, l]) => l);
      if (need.length) add('warn', `${x.name || '(名前なし)'} さんの労働者名簿に未記入の項目`, need.join('、'), '労働基準法107条', 'staff');
      if (x.email && !x.consent) add('info', `${x.name} さんは給与明細の電子交付に同意していない`, 'メールでは給与明細を送らず、紙で渡してください。', '所得税法231条2項', 'mail');
    });

    // 打刻もれ
    d.punches.filter(p => p.in && !p.out && p.date < today).forEach(p => add('warn', `${S.staff(p.staffId)?.name} さん ${U.label(p.date)} の退勤の打刻がない`, '本人に確認して、理由を書いて修正してください。', '労働安全衛生法66条の8の3', 'attendance'));

    // 確定後の打刻修正
    d.payrolls.forEach(p => {
      const st = S.staff(p.staffId); if (!st) return;
      const live = App.Pay.month(st, p.ym, d);
      if (live.gross !== p.gross) add('warn', `${p.name} さん ${U.ymLabel(p.ym)}分：確定後に打刻が変わり、給与額が${U.yen(live.gross - p.gross)}ずれている`, '差額の精算が必要か確認してください。', '労働基準法24条（全額払い）', 'payroll');
    });

    // 数値の確認
    if (/要確認/.test(s.tax.version)) add('info', '源泉所得税の数値が令和8年分の税額表に合っているか確認が必要', s.tax.version, '所得税法185条', 'config');
    if (/要確認/.test(s.empInsNote)) add('info', '雇用保険料率が今年度の率か確認が必要', `${s.empInsRate}（${s.empInsNote}）`, '労働保険徴収法', 'config');
    if (/要確認/.test(s.minWageNote)) add('info', '最低賃金の額が今の額か確認が必要', `${s.minWagePref} ${U.yen(s.minWage)}（${s.minWageNote}）`, '最低賃金法', 'config');
    return out;
  };

  const COVER = [
    ['労働基準法15条', '労働条件の明示（労働条件通知書）', 'none', '試作版にはありません。雇い入れ時に書面などで渡してください。'],
    ['労働基準法24条', '賃金の支払い（全額・毎月1回以上・一定期日）', 'ok', '月末締め・毎月決まった給料日。控除は法令で決まったものだけ。'],
    ['労働基準法32条', '労働時間（1日8時間・1週40時間）', 'ok', '超えた分を時間外として計算。'],
    ['労働基準法34条', '休憩（6時間超45分・8時間超60分）', 'ok', '足りない日を表示。打刻の修正時も確認。'],
    ['労働基準法36条', '36協定と時間外労働の上限', 'ok', '協定の有無と月・年の上限を確認。'],
    ['労働基準法37条', '割増賃金（時間外25%・月60時間超50%・深夜25%）', 'part', '休日労働（35%）は試作版では未対応。'],
    ['労働基準法39条', '年次有給休暇・年次有給休暇管理簿', 'none', '試作版にはありません。次の段階で追加が必要です。'],
    ['労働基準法60・61条', '年少者（18歳未満）の時間外・深夜労働の禁止', 'ok', '生年月日から判定して表示。'],
    ['労働基準法107条', '労働者名簿', 'ok', '「従業員名簿」タブ。法定の項目に印。'],
    ['労働基準法108条', '賃金台帳', 'ok', '「賃金台帳」タブ。'],
    ['労働基準法109条', '記録の保存（5年・当分の間3年）', 'part', '退職者・打刻・確定給与は削除しない作り。試作版はこの端末にだけ保存されるため、バックアップが必要。'],
    ['労働安全衛生法66条の8の3', '労働時間の状況の把握（客観的な記録）', 'ok', '従業員ページの打刻。管理者の修正は理由つきで記録。'],
    ['最低賃金法4条', '最低賃金', 'ok', '最低賃金より低い時給は保存できません。'],
    ['所得税法183・185条', '源泉徴収（月額表）', 'part', '税額の数値は要確認。乙欄の10万5千円以上と年末調整は未対応。'],
    ['所得税法226条', '源泉徴収票', 'part', '下書きのみ。年末調整後の金額ではありません。'],
    ['所得税法231条', '給与支払明細書の交付（電子交付は本人の承諾が必要）', 'ok', '従業員ページとメールで交付。メールは同意した人だけ。'],
    ['雇用保険法・労働保険徴収法', '雇用保険料の控除', 'ok', '料率は年度ごとに確認が必要。'],
    ['健康保険法・厚生年金保険法', '社会保険料の控除（標準報酬月額）', 'part', '月額を手入力。等級の自動計算は未対応。'],
    ['地方税法', '住民税の特別徴収', 'none', '試作版にはありません。'],
    ['個人情報保護法', '従業員の個人情報の取り扱い', 'part', '従業員ページには本人のデータと同僚の氏名だけを表示。試作版は暗号化・ログイン管理が簡易なため、本番ではサーバー側で対策が必要。'],
  ];

  Admin.register({
    id: 'legal', label: '法令チェック', group: 'ホーム', lead: '労働時間・賃金・税・個人情報について、対応が必要なところを自動で探します。ここに出ないから問題がない、とは限りません。最終的な判断は社会保険労務士・税理士に確認してください。',
    badge() { return Legal.issues(S.get()).filter(i => i.level === 'bad').length; },
    render(main) {
      const list = Legal.issues(S.get());
      const n = l => list.filter(i => i.level === l).length;
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">すぐ対応が必要</span><b class="tile-num">${n('bad')}<small> 件</small></b><span class="tile-sub">法令に反するおそれ</span></div>
        <div class="tile"><span class="tile-label">確認が必要</span><b class="tile-num">${n('warn')}<small> 件</small></b><span class="tile-sub">記録の不足・上限が近い</span></div>
        <div class="tile"><span class="tile-label">お知らせ</span><b class="tile-num">${n('info')}<small> 件</small></b><span class="tile-sub">数値の確認など</span></div></section>`));
      const lab = { bad: ['すぐ対応', 'chip bad'], warn: ['確認', 'chip warn'], info: ['お知らせ', 'chip'] };
      const order = { bad: 0, warn: 1, info: 2 };
      main.append(UI.el(`<section class="card"><h2>見つかったこと</h2><ul class="issues">${list.sort((a, b) => order[a.level] - order[b.level]).map(i => `<li class="issue ${i.level}"><span class="${lab[i.level][1]}">${lab[i.level][0]}</span><div><b>${U.esc(i.title)}</b>${i.detail ? `<p>${U.esc(i.detail)}</p>` : ''}<small class="muted">${U.esc(i.law)}</small></div><a class="btn sm" href="#${i.tab}">開く</a></li>`).join('') || '<li class="muted">今のデータでは、見つかったことはありません。</li>'}</ul></section>`));
      const st = { ok: ['対応', 'chip good'], part: ['一部対応', 'chip warn'], none: ['未対応', 'chip bad'] };
      main.append(UI.el(`<section class="card"><h2>法令ごとの対応状況（試作版）</h2><div class="scroll"><table class="tbl"><thead><tr><th>法令</th><th>内容</th><th>状況</th><th>この画面での扱い</th></tr></thead><tbody>${COVER.map(([law, what, s2, note]) => `<tr><td class="nowrap">${law}</td><td>${what}</td><td><span class="${st[s2][1]}">${st[s2][0]}</span></td><td class="small">${note}</td></tr>`).join('')}</tbody></table></div></section>`));
    },
  });
})();
