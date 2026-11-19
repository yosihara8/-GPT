/* ミセカン 管理画面：給与計算・給与明細・源泉徴収 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  const ps = { ym: U.ymAdd(U.ym(U.today()), -1), slipYm: U.ymAdd(U.ym(U.today()), -1), slipStaff: '', year: new Date().getFullYear() };
  const confirmed = (d, ym, sid) => d.payrolls.find(p => p.ym === ym && p.staffId === sid);

  /* 給与明細の表示（管理画面・従業員アプリで共通） */
  App.payslipHtml = function (p, storeName, payDay, draft) {
    const row = (l, v, cls) => `<tr class="${cls || ''}"><th>${l}</th><td class="r mono">${v}</td></tr>`;
    return `<div class="slip">
      <div class="slip-head"><div><b class="slip-title">給与明細書</b><span>${U.ymLabel(p.ym)}分${draft ? '（見込み）' : ''}</span></div><div class="r"><b>${U.esc(p.name)}</b> 様<br><small class="muted">${U.esc(storeName)}${payDay ? ` ・ 支給日 毎月${payDay}日` : ''}</small></div></div>
      <div class="slip-grid">
        <table class="slip-t"><caption>勤怠</caption>${row('時給', U.yen(p.wage))}${row('出勤日数', p.days + '日')}${row('労働時間', U.hm(p.workMin))}${row('うち残業', U.hm(p.otMin))}${row('うち深夜', U.hm(p.nightMin))}</table>
        <table class="slip-t"><caption>支給</caption>${row('基本給（時給×時間）', U.yen(p.base))}${row('残業手当', U.yen(p.otPay))}${row('深夜手当', U.yen(p.nightPay))}${row('通勤手当（非課税）', U.yen(p.transport))}${row('総支給額', U.yen(p.gross), 'total')}</table>
        <table class="slip-t"><caption>控除</caption>${row('雇用保険料', U.yen(p.empIns))}${row('社会保険料', U.yen(p.social))}${row('所得税', U.yen(p.tax))}${row('控除合計', U.yen(p.deductions), 'total')}</table>
      </div>
      <div class="slip-net"><span>差引支給額</span><b class="mono">${U.yen(p.net)}</b></div>
      ${p.taxNote ? `<p class="notice">${U.esc(p.taxNote)}</p>` : ''}
    </div>`;
  };

  /* ================= 給与計算 ================= */
  Admin.register({
    id: 'payroll', label: '給与計算', group: '人事・給与', lead: '打刻をもとに月ごとの給与を計算します。内容を確認して「確定」すると、従業員アプリに給与明細が届きます。',
    render(main) {
      const d = S.get(), ym = ps.ym;
      const bar = UI.el(`<div class="toolbar"></div>`);
      bar.append(UI.stepper(U.ymLabel(ym) + '分', () => { ps.ym = U.ymAdd(ym, -1); Admin.refresh(); }, () => { ps.ym = U.ymAdd(ym, 1); Admin.refresh(); }));
      const staff = d.staff.filter(s => s.active || d.punches.some(p => p.staffId === s.id && p.date.startsWith(ym)));
      const rows = staff.map(s => ({ s, live: App.Pay.month(s, ym, d), fixed: confirmed(d, ym, s.id) })).filter(r => r.live.days || r.fixed);
      const notYet = rows.filter(r => !r.fixed && r.live.days);
      const btn = UI.el(`<div class="toolbar-r"><span class="muted small">締め：月末 ・ 計算期間 ${U.label(ym + '-01')}〜${U.label(U.monthDays(ym).pop())}</span><button class="btn primary sm" ${notYet.length ? '' : 'disabled'}>未確定の${notYet.length}人分を確定</button></div>`);
      btn.querySelector('button').onclick = async () => {
        const open = notYet.filter(r => r.live.openDays).length;
        if (!await UI.confirm(`${U.ymLabel(ym)}分の給与を${notYet.length}人分確定し、従業員アプリに明細を届けます。${open ? `退勤の打刻もれがある人が${open}人います（その日は計算に入っていません）。` : ''}`, '確定する')) return;
        notYet.forEach(r => d.payrolls.push(Object.assign(r.live, { id: U.uid(), confirmedAt: new Date().toISOString() })));
        S.save(); UI.toast('確定しました'); Admin.refresh();
      };
      bar.append(btn); main.append(bar);

      const list = rows.map(r => r.fixed || r.live);
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">総支給額の合計</span><b class="tile-num">${U.yen(U.sum(list, p => p.gross))}</b><span class="tile-sub">${list.length}人分</span></div>
        <div class="tile"><span class="tile-label">差引支給額の合計（振込額）</span><b class="tile-num">${U.yen(U.sum(list, p => p.net))}</b><span class="tile-sub">支給日 ${U.label(U.ymAdd(ym, 1) + '-' + U.pad(Math.min(d.settings.payDay, 28)))}</span></div>
        <div class="tile"><span class="tile-label">預かる所得税（支給月の翌月10日までに納付）</span><b class="tile-num">${U.yen(U.sum(list, p => p.tax))}</b><span class="tile-sub">雇用保険料 ${U.yen(U.sum(list, p => p.empIns))}</span></div>
      </section>`));

      const card = UI.el(`<section class="card"><div class="scroll"><table class="tbl hover"><thead><tr><th>名前</th><th class="r">時給</th><th class="r">日数</th><th class="r">労働時間</th><th class="r">総支給</th><th class="r">雇用保険</th><th class="r">社会保険</th><th class="r">所得税</th><th class="r">差引支給</th><th>状態</th><th></th></tr></thead><tbody>${rows.map((r, i) => {
        const p = r.fixed || r.live, changed = r.fixed && r.fixed.gross !== r.live.gross;
        return `<tr><td class="nowrap"><i class="dot" style="background:${r.s.color}"></i>${U.esc(r.s.name)} <small class="muted">${r.s.taxCol}欄</small></td><td class="r mono">${U.yen(p.wage)}</td><td class="r">${p.days}</td><td class="r mono">${U.hm(p.workMin)}</td><td class="r mono">${U.yen(p.gross)}</td><td class="r mono">${U.yen(p.empIns)}</td><td class="r mono">${U.yen(p.social)}</td><td class="r mono">${U.yen(p.tax)}</td><td class="r mono"><b>${U.yen(p.net)}</b></td>
          <td class="nowrap">${r.fixed ? '<span class="chip good">確定済み</span>' : '<span class="chip warn">未確定</span>'}${changed ? ' <span class="chip bad" title="確定後に打刻が修正されました">打刻が変わっています</span>' : ''}${r.live.openDays ? ` <span class="chip bad">打刻もれ${r.live.openDays}</span>` : ''}</td>
          <td class="nowrap"><button class="btn sm" data-view="${i}">明細</button>${r.fixed ? ` <button class="btn sm" data-undo="${i}">確定を取り消す</button>` : ''}</td></tr>`;
      }).join('') || '<tr><td colspan="11" class="muted">この月の勤務はありません</td></tr>'}</tbody></table></div>
      <p class="muted small">計算方法：基本給＝時給×実働時間、残業（1日8時間超）と深夜（22〜5時）はそれぞれ時給×${(d.settings.otRate - 1).toFixed(2)}・×${(d.settings.nightRate - 1).toFixed(2)}を加算。雇用保険料は総支給額×${d.settings.empInsRate}。所得税は社会保険料等を引いた課税額から計算。率や税の数値は「設定・データ」で変えられます。</p></section>`);
      card.onclick = async e => {
        const t = e.target;
        if (t.dataset.view) { const r = rows[+t.dataset.view]; UI.modal('給与明細', App.payslipHtml(r.fixed || r.live, d.settings.storeName, d.settings.payDay, !r.fixed)); }
        if (t.dataset.undo) {
          const r = rows[+t.dataset.undo];
          if (!await UI.confirm(`${r.s.name} さんの${U.ymLabel(ym)}分の確定を取り消します。従業員アプリからこの明細が見えなくなります。`, '取り消す', true)) return;
          d.payrolls = d.payrolls.filter(x => x !== r.fixed); S.save(); Admin.refresh();
        }
      };
      main.append(card);
    },
  });

  /* ================= 給与明細 ================= */
  Admin.register({
    id: 'payslip', label: '給与明細', group: '人事・給与', lead: '確定した給与明細を見られます。従業員アプリには本人の分だけが届きます。',
    render(main) {
      const d = S.get();
      const months = [...new Set(d.payrolls.map(p => p.ym))].sort().reverse();
      if (!months.length) { main.append(UI.el(`<section class="card"><p class="muted">確定した給与はまだありません。「給与計算」タブで確定してください。</p></section>`)); return; }
      if (!months.includes(ps.slipYm)) ps.slipYm = months[0];
      const list = d.payrolls.filter(p => p.ym === ps.slipYm);
      if (!list.some(p => p.staffId === ps.slipStaff)) ps.slipStaff = list[0]?.staffId || '';
      const bar = UI.el(`<div class="toolbar"><select id="sYm" aria-label="月">${U.options(months.map(m => [m, U.ymLabel(m) + '分']), ps.slipYm)}</select><div class="pills">${list.map(p => `<button class="pill${p.staffId === ps.slipStaff ? ' on' : ''}" data-s="${p.staffId}">${U.esc(p.name)}</button>`).join('')}</div></div>`);
      bar.querySelector('#sYm').onchange = e => { ps.slipYm = e.target.value; Admin.refresh(); };
      bar.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { ps.slipStaff = b.dataset.s; Admin.refresh(); }; });
      main.append(bar);
      const p = list.find(x => x.staffId === ps.slipStaff);
      if (p) main.append(UI.el(`<section class="card">${App.payslipHtml(p, d.settings.storeName, d.settings.payDay)}<p class="muted small">確定日時 ${p.confirmedAt.slice(0, 16).replace('T', ' ')}</p></section>`));
    },
  });

  /* ================= 源泉徴収 ================= */
  Admin.register({
    id: 'tax', label: '源泉徴収', group: '人事・給与', lead: '確定した給与から、源泉徴収簿（月ごとの記録）と源泉徴収票の下書きを作ります。給与を支払った年（1〜12月支給分）で集計します。',
    render(main) {
      const d = S.get(), y = ps.year;
      const bar = UI.el(`<div class="toolbar"></div>`);
      bar.append(UI.stepper(`${y}年（${U.wareki(y)}）`, () => { ps.year--; Admin.refresh(); }, () => { ps.year++; Admin.refresh(); }));
      main.append(bar);
      const payYm = p => U.ymAdd(p.ym, 1);   // 月末締め・翌月払い：支払った年で集計する
      const yrs = d.payrolls.filter(p => payYm(p).startsWith(String(y)));
      main.append(UI.el(`<p class="notice">年末調整はまだ反映していません（試作）。源泉徴収票の「源泉徴収税額」は、毎月預かった所得税の合計です。提出前に税理士または国税庁の資料で確認してください。</p>`));

      const months = [...Array(12)].map((_, i) => `${y}-${U.pad(i + 1)}`);
      const people = d.staff.filter(s => yrs.some(p => p.staffId === s.id));
      main.append(UI.el(`<section class="card"><h2>月別の納付額（全員分）</h2><div class="scroll"><table class="tbl"><thead><tr><th>支給月</th><th class="r">支給人数</th><th class="r">課税支給額</th><th class="r">所得税</th><th>納付期限</th></tr></thead><tbody>${months.map(m => {
        const l = yrs.filter(p => payYm(p) === m); if (!l.length) return '';
        return `<tr><td>${+m.slice(5)}月支給<small class="muted">（${U.ymLabel(U.ymAdd(m, -1))}分）</small></td><td class="r">${l.length}人</td><td class="r mono">${U.yen(U.sum(l, p => p.taxable))}</td><td class="r mono"><b>${U.yen(U.sum(l, p => p.tax))}</b></td><td>${U.label(U.ymAdd(m, 1) + '-10')}</td></tr>`;
      }).join('') || '<tr><td colspan="5" class="muted">この年の確定した給与はありません</td></tr>'}</tbody></table></div><p class="muted small">所得税は「給与を支払った月の翌月10日」までに納めます。月末締め・翌月${d.settings.payDay}日払いなので、たとえば10月分（11月${d.settings.payDay}日支給）は12月10日が期限です。納期の特例を受けている場合は年2回（7/10・1/20）にまとめて納めます。</p></section>`));

      people.forEach(s => {
        const l = yrs.filter(p => p.staffId === s.id).sort((a, b) => a.ym.localeCompare(b.ym));
        const pay = U.sum(l, p => p.taxable), tax = U.sum(l, p => p.tax), soc = U.sum(l, p => p.empIns + p.social);
        const after = Math.max(0, pay - App.Pay.annualKyuyo(pay));
        main.append(UI.el(`<section class="card"><h2><i class="dot" style="background:${s.color}"></i>${U.esc(s.name)} <small class="muted">${s.taxCol}欄 ・ 扶養${s.dependents}人</small></h2>
          <div class="grid-2"><div class="scroll"><table class="tbl"><thead><tr><th>支給月</th><th class="r">課税支給額</th><th class="r">社会保険料等</th><th class="r">所得税</th></tr></thead><tbody>${l.map(p => `<tr><td>${+payYm(p).slice(5)}月支給</td><td class="r mono">${U.yen(p.taxable)}</td><td class="r mono">${U.yen(p.empIns + p.social)}</td><td class="r mono">${U.yen(p.tax)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td>合計</td><td class="r mono">${U.yen(pay)}</td><td class="r mono">${U.yen(soc)}</td><td class="r mono">${U.yen(tax)}</td></tr></tfoot></table></div>
          <div class="gensen"><div class="gensen-title">${U.wareki(y)}分 給与所得の源泉徴収票（下書き）</div>
            <dl><dt>支払を受ける者</dt><dd>${U.esc(s.name)}</dd><dt>種別</dt><dd>給料・賃金</dd>
            <dt>支払金額</dt><dd class="mono">${U.yen(pay)}</dd><dt>給与所得控除後の金額（概算）</dt><dd class="mono">${U.yen(after)}</dd>
            <dt>社会保険料等の金額</dt><dd class="mono">${U.yen(soc)}</dd><dt>源泉徴収税額</dt><dd class="mono"><b>${U.yen(tax)}</b></dd>
            <dt>支払者</dt><dd>${U.esc(d.settings.storeName)}</dd></dl></div></div></section>`));
      });
    },
  });
})();
