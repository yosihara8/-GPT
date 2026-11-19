/* ミセカン 管理者ページ：メール配信（月1回・本人分だけ）
 * 試作版では実際には送信しません。送信日・宛先・本文の確認と、送信予定の記録までです。
 * 本番では、サーバー（例：Google Apps Script）が決まった日に1人ずつ別々のメールで送ります。
 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  const Mail = App.Mail = {};
  const ms = { staff: '', date: '' };

  /* 次に送る日（未設定なら null） */
  Mail.nextDate = function (s) {
    const m = s.mail, today = U.today();
    if (m.timing === 'unset' || m.timing === 'confirm') return null;
    const day = m.timing === 'payday' ? s.payDay : m.day;
    const at = ym => `${ym}-${U.pad(Math.min(day, U.monthDays(ym).length))}`;
    const ym = U.ym(today);
    return at(ym) >= today ? at(ym) : at(U.ymAdd(ym, 1));
  };
  Mail.timingLabel = function (s) {
    const m = s.mail;
    return { unset: '未設定（あとで指定）', payday: `毎月の給料日（${s.payDay}日）`, day: `毎月${m.day}日`, confirm: '給与を確定したとき' }[m.timing];
  };

  /* 1人分のメールを作る。送る日を基準に「直近で確定した給与の月」と「翌月のシフト」を入れる */
  Mail.build = function (d, st, sendDate) {
    const s = d.settings, m = s.mail;
    const slip = d.payrolls.filter(p => p.staffId === st.id && p.ym < U.ym(sendDate)).sort((a, b) => b.ym.localeCompare(a.ym))[0];
    const ym = slip ? slip.ym : U.ymAdd(U.ym(sendDate), -1);
    const shiftYm = U.ymAdd(U.ym(sendDate), 1);
    const subject = m.subject.replace(/\{店舗名\}/g, s.storeName).replace(/\{年月\}/g, U.ymLabel(ym));
    const L = [];
    L.push(`${st.name} 様`, '', `いつもありがとうございます。${s.storeName}です。`, `${U.ymLabel(ym)}分の給与明細・勤怠と、${U.ymLabel(shiftYm)}のシフトをお知らせします。`, '');
    if (m.payslip) {
      L.push(`■ 給与明細（${U.ymLabel(ym)}分）`);
      if (!st.consent) L.push('　給与明細は紙でお渡しします（メールでの受け取りに同意をいただいていないため）。');
      else if (!slip) L.push('　まだ確定していません。確定したら従業員ページでご確認いただけます。');
      else {
        L.push(`　計算期間　${U.label(slip.periodStart)}〜${U.label(slip.periodEnd)}　支給日　${U.label(slip.payDate)}`,
          `　時給　${U.yen(slip.wage)}　労働日数　${slip.days}日　労働時間　${U.hm(slip.workMin)}（時間外 ${U.hm(slip.otMin)}・深夜 ${U.hm(slip.nightMin)}）`,
          `　基本給　${U.yen(slip.base)}　時間外手当　${U.yen(slip.otPay)}　深夜手当　${U.yen(slip.nightPay)}　通勤手当　${U.yen(slip.transport)}`,
          `　総支給額　${U.yen(slip.gross)}`,
          `　雇用保険料　${U.yen(slip.empIns)}　社会保険料　${U.yen(slip.social)}　所得税　${U.yen(slip.tax)}　控除合計　${U.yen(slip.deductions)}`,
          `　差引支給額　${U.yen(slip.net)}`);
      }
      L.push('');
    }
    if (m.attendance) {
      L.push(`■ 勤怠（${U.ymLabel(ym)}の打刻）`);
      const ps = d.punches.filter(p => p.staffId === st.id && p.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date));
      ps.forEach(p => { const c = App.Pay.day(p); L.push(`　${U.label(p.date)}　${p.in}〜${p.out || '（退勤の打刻なし）'}　休憩${p.breakMin}分　実働 ${c ? U.hm(c.work) : '−'}`); });
      if (!ps.length) L.push('　この月の打刻はありません。');
      L.push('');
    }
    if (m.shift) {
      L.push(`■ ${U.ymLabel(shiftYm)}のシフト（${U.label(sendDate)}時点で確定している分）`);
      const sh = d.shifts.filter(x => x.staffId === st.id && x.date.startsWith(shiftYm)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      sh.forEach(x => L.push(`　${U.label(x.date)}　${U.short(x.start)}〜${U.short(x.end)}`));
      if (!sh.length) L.push('　まだ確定しているシフトはありません。');
      L.push('');
    }
    L.push('――――――――――', `このメールは ${s.storeName} から、ご本人だけにお送りしています。`, '内容に誤りがある場合や、メールでの受け取りをやめたい場合は店長にお知らせください。', '心当たりのない方は、お手数ですが破棄してください。');
    return { to: st.email, subject, body: L.join('\n'), ym, shiftYm };
  };

  Admin.register({
    id: 'mail', label: 'メール配信', group: '人事・給与', lead: '従業員1人ずつに、本人の給与明細・勤怠・翌月のシフトを月1回メールで送る設定です。試作版では実際には送信せず、送信予定の記録までを行います。',
    render(main) {
      const d = S.get(), s = d.settings, m = s.mail, next = Mail.nextDate(s);
      main.append(UI.el(`<p class="notice">試作版：メールは送信されません。「送信予定に記録」を押しても、記録が残るだけです。本番で送るには、サーバー側の仕組み（例：Googleスプレッドシート＋Apps Script）が必要です。</p>`));
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">自動送信</span><b class="tile-num">${m.enabled && m.timing !== 'unset' ? 'オン' : 'オフ'}</b><span class="tile-sub">${m.enabled && m.timing === 'unset' ? '送信日が未設定のため止まっています' : '設定で切り替えます'}</span></div>
        <div class="tile"><span class="tile-label">送信のタイミング</span><b class="tile-num small-num">${U.esc(Mail.timingLabel(s))}</b><span class="tile-sub">${next ? `次回 ${U.label(next)}` : m.timing === 'confirm' ? '給与計算タブで確定したとき' : '送信日はあとで指定してください'}</span></div>
        <div class="tile"><span class="tile-label">送る人</span><b class="tile-num">${d.staff.filter(x => x.active && x.email).length}<small> 人</small></b><span class="tile-sub">給与明細つき ${d.staff.filter(x => x.active && x.email && x.consent).length}人</span></div></section>`));

      const cfg = UI.el(`<section class="card"><h2>送信の設定</h2><form class="form">
        <label class="check wide"><input type="checkbox" id="m_enabled" ${m.enabled ? 'checked' : ''}> 月1回の自動送信を使う</label>
        <label class="field">送信のタイミング<select id="m_timing">${U.options([['unset', '未設定（あとで指定）'], ['payday', '毎月の給料日'], ['day', '毎月決まった日'], ['confirm', '給与を確定したとき']], m.timing)}</select></label>
        <label class="field">決まった日（毎月）<input id="m_day" type="number" min="1" max="31" value="${m.day}"></label>
        <label class="field">差出人の名前<input id="m_fromName" value="${U.esc(m.fromName)}"></label>
        <label class="field wide">件名（{店舗名}・{年月} が入れ替わります）<input id="m_subject" value="${U.esc(m.subject)}"></label>
        <label class="check"><input type="checkbox" id="m_payslip" ${m.payslip ? 'checked' : ''}> 給与明細（同意した人だけ）</label>
        <label class="check"><input type="checkbox" id="m_attendance" ${m.attendance ? 'checked' : ''}> その月の勤怠（打刻）</label>
        <label class="check"><input type="checkbox" id="m_shift" ${m.shift ? 'checked' : ''}> 翌月のシフト</label>
        <div class="wide row-end"><button class="btn primary">設定を保存</button></div></form>
        <p class="muted small">メールは1人ずつ別々に送り、ほかの人のアドレスや内容は入りません。給与明細をメールで送れるのは、電子交付に同意した人だけです（所得税法231条2項・同施行令356条）。同意のない人には、給与明細を除いた内容を送り、明細は紙で渡します。</p></section>`);
      cfg.querySelector('form').onsubmit = e => {
        e.preventDefault(); const v = id => cfg.querySelector('#m_' + id);
        m.enabled = v('enabled').checked; m.timing = v('timing').value; m.day = Math.min(31, Math.max(1, Number(v('day').value) || 1));
        m.fromName = v('fromName').value.trim(); m.subject = v('subject').value.trim() || '【{店舗名}】{年月}分 給与明細・勤怠・シフトのお知らせ';
        m.payslip = v('payslip').checked; m.attendance = v('attendance').checked; m.shift = v('shift').checked;
        S.log('管理者', 'メール配信の設定を変更', 'メール配信', `${Mail.timingLabel(s)} / ${m.enabled ? 'オン' : 'オフ'}`);
        S.save(); UI.toast('保存しました'); Admin.refresh();
      };
      main.append(cfg);

      const rec = UI.el(`<section class="card"><h2>送り先</h2><div class="scroll"><table class="tbl"><thead><tr><th>氏名</th><th>メールアドレス</th><th>電子交付の同意</th><th>送る内容</th></tr></thead><tbody>${d.staff.filter(x => x.active).map(x => `<tr><td class="nowrap"><i class="dot" style="background:${x.color}"></i>${U.esc(x.name)}</td><td>${x.email ? U.esc(x.email) : '<span class="chip">未登録</span>'}</td><td>${x.consent ? `<span class="chip good">同意 ${U.esc(x.consentDate)}</span>` : '<span class="chip warn">同意なし</span>'}</td><td>${!x.email ? '<span class="muted">送りません</span>' : [m.payslip ? (x.consent ? '給与明細' : '<s>給与明細</s>（紙）') : '', m.attendance ? '勤怠' : '', m.shift ? 'シフト' : ''].filter(Boolean).join('・')}</td></tr>`).join('')}</tbody></table></div><p class="muted small">アドレスと同意は「従業員名簿」で変えられます。</p></section>`);
      main.append(rec);

      const people = d.staff.filter(x => x.active && x.email);
      if (!people.some(x => x.id === ms.staff)) ms.staff = people[0]?.id || '';
      if (!ms.date) ms.date = next || U.today();
      const st = S.staff(ms.staff);
      const pv = UI.el(`<section class="card"><h2>本文の確認</h2><div class="toolbar"><div class="pills">${people.map(x => `<button class="pill${x.id === ms.staff ? ' on' : ''}" data-s="${x.id}">${U.esc(x.name)}</button>`).join('')}</div><label class="inline">送る日 <input type="date" id="pvDate" value="${ms.date}"></label></div></section>`);
      if (st) {
        const mail = Mail.build(d, st, ms.date);
        pv.append(UI.el(`<div class="mail-pv"><dl><div><dt>差出人</dt><dd>${U.esc(m.fromName)}</dd></div><div><dt>宛先</dt><dd>${U.esc(mail.to)}</dd></div><div><dt>件名</dt><dd>${U.esc(mail.subject)}</dd></div></dl><pre>${U.esc(mail.body)}</pre></div>`));
        const b = UI.el(`<div class="row-end"><button class="btn primary">送信予定に記録（試作：送信しません）</button></div>`);
        b.querySelector('button').onclick = async () => {
          if (!await UI.confirm(`${st.name} さん（${st.email}）あてのメールを、送信予定として記録します。実際には送信されません。`, '記録する')) return;
          d.mailLog.push({ at: new Date().toISOString().slice(0, 19), staffId: st.id, name: st.name, to: st.email, subject: mail.subject, sendDate: ms.date, payslip: m.payslip && st.consent, status: '記録のみ（試作）' });
          S.log('管理者', 'メールを送信予定に記録', st.name, mail.subject);
          S.save(); UI.toast('記録しました'); Admin.refresh();
        };
        pv.append(b);
      } else pv.append(UI.el(`<p class="muted">メールアドレスが登録された従業員がいません。</p>`));
      pv.querySelectorAll('[data-s]').forEach(b => { b.onclick = () => { ms.staff = b.dataset.s; Admin.refresh(); }; });
      pv.querySelector('#pvDate').onchange = e => { if (e.target.value) { ms.date = e.target.value; Admin.refresh(); } };
      main.append(pv);

      main.append(UI.el(`<section class="card"><h2>送信の記録</h2><div class="scroll"><table class="tbl"><thead><tr><th>記録した日時</th><th>送る日</th><th>宛先</th><th>件名</th><th>給与明細</th><th>状態</th></tr></thead><tbody>${d.mailLog.slice().reverse().slice(0, 50).map(l => `<tr><td class="num nowrap">${l.at.replace('T', ' ').slice(0, 16)}</td><td class="nowrap">${U.label(l.sendDate)}</td><td>${U.esc(l.name)}<br><small class="muted">${U.esc(l.to)}</small></td><td>${U.esc(l.subject)}</td><td>${l.payslip ? 'あり' : 'なし'}</td><td><span class="chip">${U.esc(l.status)}</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">まだ記録はありません</td></tr>'}</tbody></table></div></section>`));
    },
  });
})();
