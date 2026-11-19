/* ミセカン 管理画面：給与計算・給与明細・源泉徴収 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  const ps = { ym: U.ymAdd(U.ym(U.today()), -1), slipYm: U.ymAdd(U.ym(U.today()), -1), slipStaff: '', year: new Date().getFullYear() };
  const confirmed = (d, ym, sid) => d.payrolls.find(p => p.ym === ym && p.staffId === sid);

  /* ================= 給与計算 ================= */
  Admin.register({
    id: 'payroll', label: '給与計算', group: '人事・給与', lead: '打刻をもとに月ごとの給与を計算します。内容を確認して「確定」すると、従業員ページに給与明細が届きます。',
    render(main) {
      const d = S.get(), ym = ps.ym;
      const bar = UI.el(`<div class="toolbar"></div>`);
      bar.append(UI.stepper(U.ymLabel(ym) + '分', () => { ps.ym = U.ymAdd(ym, -1); Admin.refresh(); }, () => { ps.ym = U.ymAdd(ym, 1); Admin.refresh(); }));
      const staff = d.staff.filter(s => s.active || d.punches.some(p => p.staffId === s.id && p.date.startsWith(ym)));
      const rows = staff.map(s => ({ s, live: App.Pay.month(s, ym, d), fixed: confirmed(d, ym, s.id) })).filter(r => r.live.days || r.fixed);
      const notYet = rows.filter(r => !r.fixed && r.live.days);
      const closed = U.monthDays(ym).pop() < U.today();   // 締め日（月末）を過ぎた月だけ確定できる
      const btn = UI.el(`<div class="toolbar-r"><span class="muted small">締め：月末 ・ 計算期間 ${U.label(ym + '-01')}〜${U.label(U.monthDays(ym).pop())}${closed ? '' : ' ・ <b>まだ締め日前のため確定できません</b>'}</span><button class="btn primary sm" ${notYet.length && closed ? '' : 'disabled'}>未確定の${notYet.length}人分を確定</button></div>`);
      btn.querySelector('button').onclick = async () => {
        const open = notYet.filter(r => r.live.openDays).length;
        if (!await UI.confirm(`${U.ymLabel(ym)}分の給与を${notYet.length}人分確定し、従業員ページに明細を届けます。${open ? `退勤の打刻もれがある人が${open}人います（その日は計算に入っていません）。` : ''}`, '確定する')) return;
        notYet.forEach(r => d.payrolls.push(Object.assign(r.live, { id: U.uid(), confirmedAt: new Date().toISOString() })));
        S.log('管理者', '給与を確定', `${U.ymLabel(ym)}分`, notYet.map(r => r.s.name).join('、'));
        S.save(); UI.toast('確定しました'); Admin.refresh();
      };
      bar.append(btn); main.append(bar);

      const list = rows.map(r => r.fixed || r.live);
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">総支給額の合計</span><b class="tile-num">${U.yen(U.sum(list, p => p.gross))}</b><span class="tile-sub">${list.length}人分</span></div>
        <div class="tile"><span class="tile-label">差引支給額の合計（振込額）</span><b class="tile-num">${U.yen(U.sum(list, p => p.net))}</b><span class="tile-sub">支給日 ${U.label(App.Pay.payDate(ym, d.settings.payDay))}</span></div>
        <div class="tile"><span class="tile-label">預かる所得税（支給月の翌月10日までに納付）</span><b class="tile-num">${U.yen(U.sum(list, p => p.tax))}</b><span class="tile-sub">雇用保険料 ${U.yen(U.sum(list, p => p.empIns))}</span></div>
      </section>`));

      const card = UI.el(`<section class="card"><div class="scroll"><table class="tbl hover"><thead><tr><th>名前</th><th class="r">時給</th><th class="r">日数</th><th class="r">労働時間</th><th class="r">総支給</th><th class="r">雇用保険</th><th class="r">社会保険</th><th class="r">所得税</th><th class="r">差引支給</th><th>状態</th><th></th></tr></thead><tbody>${rows.map((r, i) => {
        const p = r.fixed || r.live, changed = r.fixed && r.fixed.gross !== r.live.gross;
        return `<tr><td class="nowrap"><i class="dot" style="background:${r.s.color}"></i>${U.esc(r.s.name)} <small class="muted">${r.s.taxCol}欄</small></td><td class="r mono">${U.yen(p.wage)}</td><td class="r">${p.days}</td><td class="r mono">${U.hm(p.workMin)}</td><td class="r mono">${U.yen(p.gross)}</td><td class="r mono">${U.yen(p.empIns)}</td><td class="r mono">${U.yen(p.social)}</td><td class="r mono">${U.yen(p.tax)}</td><td class="r mono"><b>${U.yen(p.net)}</b></td>
          <td class="nowrap">${r.fixed ? '<span class="chip good">確定済み</span>' : '<span class="chip warn">未確定</span>'}${changed ? ' <span class="chip bad" title="確定後に打刻が修正されました">打刻が変わっています</span>' : ''}${r.live.openDays ? ` <span class="chip bad">打刻もれ${r.live.openDays}</span>` : ''}</td>
          <td class="nowrap"><button class="btn sm" data-view="${i}">明細</button>${r.fixed ? ` <button class="btn sm" data-undo="${i}">確定を取り消す</button>` : ''}</td></tr>`;
      }).join('') || '<tr><td colspan="11" class="muted">この月の勤務はありません</td></tr>'}</tbody></table></div>
      <p class="muted small">計算方法：基本給＝時給×労働時間。時間外（1日8時間・1週40時間を超えた分）は時給×${(d.settings.otRate - 1).toFixed(2)}、月60時間を超えた分は×${(d.settings.ot60Rate - 1).toFixed(2)}、深夜（22〜5時）は×${(d.settings.nightRate - 1).toFixed(2)}を加算（労働基準法37条）。雇用保険料は総支給額×${d.settings.empInsRate}。所得税は社会保険料等を引いた額から計算。給与から引けるのは法令で決まったものだけで、それ以外を引くには労使協定が必要です（労働基準法24条）。</p></section>`);
      card.onclick = async e => {
        const t = e.target;
        if (t.dataset.view) { const r = rows[+t.dataset.view]; UI.modal('給与明細', App.payslipHtml(r.fixed || r.live, { employer: d.settings.employer, draft: !r.fixed })); }
        if (t.dataset.undo) {
          const r = rows[+t.dataset.undo];
          if (!await UI.confirm(`${r.s.name} さんの${U.ymLabel(ym)}分の確定を取り消します。従業員ページからこの明細が見えなくなります。`, '取り消す', true)) return;
          d.payrolls = d.payrolls.filter(x => x !== r.fixed);
          S.log('管理者', '給与の確定を取り消し', r.s.name, `${U.ymLabel(ym)}分`);
          S.save(); Admin.refresh();
        }
      };
      main.append(card);
    },
  });

  /* ================= 給与明細 ================= */
  Admin.register({
    id: 'payslip', label: '給与明細', group: '人事・給与', lead: '確定した給与明細を見られます。従業員ページには本人の分だけが届きます。',
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
      if (p) main.append(UI.el(`<section class="card">${App.payslipHtml(p, { employer: d.settings.employer })}<p class="muted small">確定日時 ${p.confirmedAt.slice(0, 16).replace('T', ' ')}</p></section>`));
    },
  });

  /* ================= 賃金台帳（労働基準法108条・施行規則54条） ================= */
  Admin.register({
    id: 'ledger', label: '賃金台帳', group: '人事・給与', lead: '労働基準法108条で作成が義務づけられている賃金台帳です。確定した給与から、1人ずつ1年分を作ります。',
    render(main) {
      const d = S.get(), y = ps.year;
      const bar = UI.el(`<div class="toolbar"></div>`);
      bar.append(UI.stepper(`${y}年（${U.wareki(y)}）`, () => { ps.year--; Admin.refresh(); }, () => { ps.year++; Admin.refresh(); }));
      main.append(bar);
      const list = d.payrolls.filter(p => p.ym.startsWith(String(y)));
      const people = d.staff.filter(s => list.some(p => p.staffId === s.id));
      if (!people.length) main.append(UI.el(`<section class="card"><p class="muted">この年の確定した給与はありません。</p></section>`));
      const rows = [['賃金計算期間', p => `${+p.periodStart.slice(5, 7)}/${+p.periodStart.slice(8)}〜${+p.periodEnd.slice(5, 7)}/${+p.periodEnd.slice(8)}`], ['支給日', p => U.label(p.payDate)],
        ['労働日数', p => p.days + '日'], ['労働時間数', p => U.hm(p.workMin)], ['時間外労働時間数', p => U.hm(p.otMin)], ['休日労働時間数', () => '0:00'], ['深夜労働時間数', p => U.hm(p.nightMin)],
        ['基本給', p => U.yen(p.base)], ['時間外労働手当', p => U.yen(p.otPay)], ['深夜労働手当', p => U.yen(p.nightPay)], ['通勤手当', p => U.yen(p.transport)], ['総支給額', p => U.yen(p.gross), 'total'],
        ['雇用保険料', p => U.yen(p.empIns)], ['社会保険料', p => U.yen(p.social)], ['所得税', p => U.yen(p.tax)], ['控除合計', p => U.yen(p.deductions)], ['差引支給額', p => U.yen(p.net), 'total']];
      people.forEach(s => {
        const ps2 = list.filter(p => p.staffId === s.id).sort((a, b) => a.ym.localeCompare(b.ym));
        main.append(UI.el(`<section class="card"><h2><i class="dot" style="background:${s.color}"></i>${U.esc(s.name)} <small class="muted">性別：${U.esc(s.gender || '未記入')} ・ ${U.esc(s.job || '')}</small></h2>
          <div class="scroll"><table class="tbl ledger"><thead><tr><th>項目</th>${ps2.map(p => `<th class="r">${+p.ym.slice(5)}月分</th>`).join('')}</tr></thead><tbody>${rows.map(([l, f, c]) => `<tr class="${c || ''}"><th>${l}</th>${ps2.map(p => `<td class="r num">${f(p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`));
      });
      main.append(UI.el(`<p class="muted small">記入する項目：氏名、性別、賃金計算期間、労働日数、労働時間数、時間外・休日・深夜の労働時間数、基本給・手当などの種類ごとの額、控除の項目と額（労働基準法施行規則54条）。最後の記入の日から5年間（当分の間は3年間）保存します（同法109条）。休日労働（法定休日の労働）は試作版では記録していないため0:00と表示しています。</p>`));
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
