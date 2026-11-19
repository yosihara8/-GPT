/* ミセカン 管理画面：シフト（週間で作成・1日の階段表）と勤怠 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  const st = { view: App.pref.get('shiftView', 'week'), week: U.monday(U.today()), date: U.today() };

  const times = () => { const s = S.get().settings; return U.timeOptions(s.openHour, s.closeHour, s.step); };
  const cost = sh => { const p = S.staff(sh.staffId); return p ? p.wage * (U.toMin(sh.end) - U.toMin(sh.start)) / 60 : 0; };
  const clash = (d, sid, date, start, end, skipId) => d.shifts.some(x => x.id !== skipId && x.staffId === sid && x.date === date && U.toMin(start) < U.toMin(x.end) && U.toMin(x.start) < U.toMin(end));

  function shiftModal(sh) {
    const d = S.get(), isNew = !sh.id, tl = times();
    const presets = [['09:00', '14:00'], ['10:00', '15:00'], ['12:00', '17:00'], ['14:00', '19:00'], ['17:00', '22:00'], ['09:00', '17:00'], ['13:00', '22:00']];
    const m = UI.modal(isNew ? 'シフトを追加' : 'シフトを変更', `<form class="form">
      <label class="field">名前<select id="m_staff">${U.options(d.staff.filter(s => s.active).map(s => [s.id, s.name]), sh.staffId)}</select></label>
      <label class="field">日付<input type="date" id="m_date" value="${sh.date}"></label>
      <label class="field">開始<select id="m_start">${U.options(tl.slice(0, -1), sh.start)}</select></label>
      <label class="field">終了<select id="m_end">${U.options(tl.slice(1), sh.end)}</select></label>
      <div class="wide chips">${presets.map(([a, b]) => `<button type="button" class="chip-btn" data-a="${a}" data-b="${b}">${U.short(a)}-${U.short(b)}</button>`).join('')}</div>
      <p class="wide err" id="m_err" role="alert"></p></form>`,
    [...(isNew ? [] : [{ label: '削除', kind: 'danger', onClick: () => { d.shifts = d.shifts.filter(x => x.id !== sh.id); S.save(); UI.toast('シフトを削除しました'); Admin.refresh(); } }]),
      { label: 'やめる' },
      { label: '保存する', kind: 'primary', onClick: w => {
        const v = id => w.querySelector('#' + id).value;
        const n = { staffId: v('m_staff'), date: v('m_date'), start: v('m_start'), end: v('m_end') };
        const err = w.querySelector('#m_err');
        if (U.toMin(n.end) <= U.toMin(n.start)) { err.textContent = '終了は開始より後にしてください'; return false; }
        if (clash(d, n.staffId, n.date, n.start, n.end, sh.id)) { err.textContent = 'この人は同じ日に時間が重なるシフトがあります'; return false; }
        if (isNew) d.shifts.push(Object.assign({ id: U.uid() }, n)); else Object.assign(d.shifts.find(x => x.id === sh.id), n);
        S.save(); UI.toast('シフトを保存しました'); Admin.refresh();
      } }]);
    m.el.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => { m.el.querySelector('#m_start').value = b.dataset.a; m.el.querySelector('#m_end').value = b.dataset.b; }; });
  }

  function approve(r) {
    const d = S.get();
    if (clash(d, r.staffId, r.date, r.start, r.end)) return false;
    r.status = 'approved';
    d.shifts.push({ id: U.uid(), staffId: r.staffId, date: r.date, start: r.start, end: r.end, fromRequest: r.id });
    return true;
  }

  /* ---------- 週間（作成） ---------- */
  function weekView(main) {
    const d = S.get(), days = [...Array(7)].map((_, i) => U.addDays(st.week, i)), today = U.today();
    const staff = d.staff.filter(s => s.active);
    const reqs = d.requests.filter(r => r.status === 'pending' && r.date >= days[0] && r.date <= days[6]);
    const bar = UI.el(`<div class="toolbar"></div>`);
    bar.append(UI.stepper(`${U.label(days[0])} 〜 ${U.label(days[6])}`, () => { st.week = U.addDays(st.week, -7); Admin.refresh(); }, () => { st.week = U.addDays(st.week, 7); Admin.refresh(); }));
    const btns = UI.el(`<div class="toolbar-r"><button class="btn sm" id="thisW">今週</button><button class="btn sm primary" id="apAll" ${reqs.length ? '' : 'disabled'}>この週の希望をまとめて承認（${reqs.length}件）</button></div>`);
    btns.querySelector('#thisW').onclick = () => { st.week = U.monday(U.today()); Admin.refresh(); };
    btns.querySelector('#apAll').onclick = async () => {
      if (!await UI.confirm(`${reqs.length}件の希望をシフトとして確定します。時間が重なるものは承認しません。`, '承認する')) return;
      let ok = 0; reqs.forEach(r => { if (approve(r)) ok++; }); S.save(); UI.toast(`${ok}件を承認しました${ok < reqs.length ? `（${reqs.length - ok}件は時間が重なるため保留）` : ''}`); Admin.refresh();
    };
    bar.append(btns); main.append(bar);

    let html = `<table class="tbl week"><thead><tr><th>名前</th>${days.map(x => `<th class="${x === today ? 'today' : ''}"><button class="link ${U.wdClass(x)}" data-day="${x}">${U.label(x)}</button></th>`).join('')}<th class="r">週の時間</th></tr></thead><tbody>`;
    staff.forEach(p => {
      let min = 0;
      html += `<tr><td class="nowrap"><i class="dot" style="background:${p.color}"></i>${U.esc(p.name)}</td>`;
      days.forEach(x => {
        const ss = d.shifts.filter(s => s.staffId === p.id && s.date === x).sort((a, b) => U.toMin(a.start) - U.toMin(b.start));
        const rr = reqs.filter(r => r.staffId === p.id && r.date === x);
        ss.forEach(s => { min += U.toMin(s.end) - U.toMin(s.start); });
        html += `<td class="cell ${x === today ? 'today' : ''}" data-add="${p.id}|${x}">${ss.map(s => `<button class="tag" style="--c:${p.color}" data-shift="${s.id}">${U.short(s.start)}-${U.short(s.end)}</button>`).join('')}${rr.map(r => `<span class="tag req" title="${U.esc(r.note || 'シフト希望')}">希望 ${U.short(r.start)}-${U.short(r.end)}<button class="mini ok" data-ok="${r.id}" aria-label="承認">✓</button><button class="mini ng" data-ng="${r.id}" aria-label="却下">✕</button></span>`).join('')}${!ss.length && !rr.length ? '<span class="add">＋</span>' : ''}</td>`;
      });
      html += `<td class="r mono">${U.hm(min)}</td></tr>`;
    });
    html += `</tbody><tfoot><tr><td>出勤人数</td>${days.map(x => `<td class="${x === today ? 'today' : ''}">${new Set(d.shifts.filter(s => s.date === x).map(s => s.staffId)).size}人</td>`).join('')}<td></td></tr>
      <tr><td>人件費（予定）</td>${days.map(x => `<td class="mono ${x === today ? 'today' : ''}">${U.yen(U.sum(d.shifts.filter(s => s.date === x), cost))}</td>`).join('')}<td class="r mono">${U.yen(U.sum(d.shifts.filter(s => s.date >= days[0] && s.date <= days[6]), cost))}</td></tr></tfoot></table>`;
    const card = UI.el(`<section class="card"><p class="muted small">点線の「希望」は従業員アプリから出されたシフト希望です。✓で確定、✕で却下。空いているマスを押すとシフトを追加、色のついたシフトを押すと変更できます。日付を押すとその日の階段表を開きます。</p><div class="scroll">${html}</div></section>`);
    card.onclick = e => {
      const t = e.target;
      if (t.dataset.day) { st.date = t.dataset.day; st.view = 'day'; Admin.refresh(); return; }
      if (t.dataset.ok) { const r = d.requests.find(x => x.id === t.dataset.ok); if (approve(r)) { S.save(); UI.toast('承認しました'); } else UI.toast('同じ日に時間が重なるシフトがあるため承認できません'); Admin.refresh(); return; }
      if (t.dataset.ng) { d.requests.find(x => x.id === t.dataset.ng).status = 'rejected'; S.save(); UI.toast('却下しました'); Admin.refresh(); return; }
      if (t.dataset.shift) { shiftModal(d.shifts.find(x => x.id === t.dataset.shift)); return; }
      const cell = t.closest('[data-add]');
      if (cell && (t === cell || t.classList.contains('add'))) { const [sid, date] = cell.dataset.add.split('|'); shiftModal({ staffId: sid, date, start: '09:00', end: '14:00' }); }
    };
    main.append(card);
  }

  /* ---------- 1日（階段表） ---------- */
  function dayView(main) {
    const d = S.get(), s = d.settings, date = st.date;
    const need = +App.pref.get('need', s.need);
    const bar = UI.el(`<div class="toolbar"></div>`);
    bar.append(UI.stepper(`<span class="${U.wdClass(date)}">${U.label(date)}</span>`, () => { st.date = U.addDays(date, -1); Admin.refresh(); }, () => { st.date = U.addDays(date, 1); Admin.refresh(); }));
    const r = UI.el(`<div class="toolbar-r"><input type="date" id="dPick" value="${date}" aria-label="日付"><button class="btn sm" id="dToday">今日</button><label class="inline">必要人数 <input type="number" id="dNeed" min="0" max="20" value="${need}"></label><button class="btn sm primary" id="dAdd">＋ シフト追加</button></div>`);
    r.querySelector('#dPick').onchange = e => { if (e.target.value) { st.date = e.target.value; Admin.refresh(); } };
    r.querySelector('#dToday').onclick = () => { st.date = U.today(); Admin.refresh(); };
    r.querySelector('#dNeed').onchange = e => { App.pref.set('need', e.target.value); Admin.refresh(); };
    r.querySelector('#dAdd').onclick = () => shiftModal({ staffId: d.staff[0]?.id, date, start: '09:00', end: '14:00' });
    bar.append(r); main.append(bar);

    const open = s.openHour * 60, slots = (s.closeHour - s.openHour) * 60 / s.step, per = 60 / s.step;
    const list = d.shifts.filter(x => x.date === date).sort((a, b) => U.toMin(a.start) - U.toMin(b.start) || U.toMin(a.end) - U.toMin(b.end));
    const count = new Array(slots).fill(0);
    let h = `<table class="gantt"><colgroup><col class="g-name"><col class="g-time">${'<col>'.repeat(slots)}</colgroup><thead><tr><th>名前</th><th>時間</th>`;
    for (let x = s.openHour; x < s.closeHour; x++) h += `<th colspan="${per}">${x}</th>`;
    h += `</tr></thead><tbody>`;
    const cell = i => `<td class="slot ${i % per === 0 ? 'hour' : ''}"></td>`;
    list.forEach(x => {
      const p = S.staff(x.staffId) || { name: '(削除済み)', color: '#888' };
      const a = Math.max(0, (U.toMin(x.start) - open) / s.step), b = Math.min(slots, (U.toMin(x.end) - open) / s.step);
      for (let i = a; i < b; i++) count[i]++;
      const pu = d.punches.find(q => q.staffId === x.staffId && q.date === date);
      h += `<tr><td class="nowrap"><i class="dot" style="background:${p.color}"></i>${U.esc(p.name)}</td><td class="mono">${U.short(x.start)}-${U.short(x.end)}</td>`;
      for (let i = 0; i < a; i++) h += cell(i);
      h += `<td class="bar" colspan="${b - a}"><button style="--c:${p.color}" data-shift="${x.id}">${U.short(x.start)}-${U.short(x.end)}${pu && pu.in ? ` <small>打刻 ${pu.in}${pu.out ? '〜' + pu.out : '〜'}</small>` : ''}</button></td>`;
      for (let i = b; i < slots; i++) h += cell(i);
      h += `</tr>`;
    });
    if (!list.length) h += `<tr><td colspan="${slots + 2}" class="muted center">この日のシフトはまだありません</td></tr>`;
    h += `</tbody><tfoot><tr><td colspan="2">人数</td>${count.map(c => `<td class="${c < need ? 'lack' : ''}">${c}</td>`).join('')}</tr></tfoot></table>`;
    const lack = count.filter(c => c < need).length * s.step / 60;
    const card = UI.el(`<section class="card"><div class="scroll">${h}</div>
      <p class="sumline">出勤 <b>${new Set(list.map(x => x.staffId)).size}人</b> ・ 合計 <b>${U.hm(U.sum(list, x => U.toMin(x.end) - U.toMin(x.start)))}</b> ・ 人件費（予定） <b>${U.yen(U.sum(list, cost))}</b>${need ? ` ・ ${lack ? `<span class="chip bad">人が足りない時間 ${lack}時間分</span>` : '<span class="chip good">必要人数を満たしています</span>'}` : ''}</p></section>`);
    card.onclick = e => { const b = e.target.closest('[data-shift]'); if (b) shiftModal(d.shifts.find(x => x.id === b.dataset.shift)); };
    main.append(card);
  }

  Admin.register({
    id: 'shift', label: 'シフト', group: '現場', lead: '従業員の希望を承認してシフトを作ります。1日の表は営業時間に沿った階段状で表示します。',
    badge() { return S.get().requests.filter(r => r.status === 'pending').length; },
    render(main) {
      const seg = UI.el(`<div class="seg" role="tablist"><button data-v="week" role="tab">週間・作成</button><button data-v="day" role="tab">1日の階段表</button></div>`);
      seg.querySelectorAll('button').forEach(b => {
        b.setAttribute('aria-selected', b.dataset.v === st.view);
        b.onclick = () => { st.view = b.dataset.v; App.pref.set('shiftView', st.view); Admin.refresh(); };
      });
      main.append(seg);
      (st.view === 'day' ? dayView : weekView)(main);
    },
  });

  /* ================= 勤怠・打刻 ================= */
  const at = { ym: U.ym(U.today()), staff: '' };
  function punchModal(p, isNew) {
    const d = S.get();
    UI.modal(isNew ? '打刻を手入力' : '打刻を修正', `<form class="form">
      <label class="field">名前<select id="q_staff" ${isNew ? '' : 'disabled'}>${U.options(d.staff.map(s => [s.id, s.name]), p.staffId)}</select></label>
      <label class="field">日付<input type="date" id="q_date" value="${p.date}" ${isNew ? '' : 'disabled'}></label>
      <label class="field">出勤<input type="time" id="q_in" value="${p.in}" required></label>
      <label class="field">退勤<input type="time" id="q_out" value="${p.out}"></label>
      <label class="field">休憩（分）<input type="number" id="q_brk" min="0" step="5" value="${p.breakMin || 0}"></label>
      <label class="field wide">修正の理由<input id="q_note" value="${U.esc(p.note || '')}" placeholder="例：退勤の打刻忘れ"></label></form>`,
    [...(isNew ? [] : [{ label: '削除', kind: 'danger', onClick: () => { d.punches = d.punches.filter(x => x.id !== p.id); S.save(); Admin.refresh(); } }]),
      { label: 'やめる' },
      { label: '保存する', kind: 'primary', onClick: w => {
        const f = w.querySelector('form'); if (!f.reportValidity()) return false;
        const v = id => w.querySelector('#' + id).value;
        const n = { in: v('q_in'), out: v('q_out'), breakMin: Number(v('q_brk')) || 0, note: v('q_note'), edited: true, breakStart: '' };
        if (isNew) {
          if (d.punches.some(x => x.staffId === v('q_staff') && x.date === v('q_date'))) { UI.toast('その日の打刻はすでにあります。一覧から修正してください'); return false; }
          d.punches.push(Object.assign({ id: U.uid(), staffId: v('q_staff'), date: v('q_date') }, n));
        } else Object.assign(d.punches.find(x => x.id === p.id), n);
        S.save(); UI.toast('打刻を保存しました'); Admin.refresh();
      } }]);
  }
  Admin.register({
    id: 'attendance', label: '勤怠・打刻', group: '現場', lead: '従業員アプリの打刻がここに集まります。打刻忘れや遅刻を確認して修正できます。',
    badge() { const d = S.get(), t = U.today(); return d.punches.filter(p => p.in && !p.out && p.date < t).length; },
    render(main) {
      const d = S.get(), today = U.today(), ym = at.ym;
      const bar = UI.el(`<div class="toolbar"></div>`);
      bar.append(UI.stepper(U.ymLabel(ym), () => { at.ym = U.ymAdd(ym, -1); Admin.refresh(); }, () => { at.ym = U.ymAdd(ym, 1); Admin.refresh(); }));
      const r = UI.el(`<div class="toolbar-r"><select id="aStaff" aria-label="従業員">${U.options([['', '全員'], ...d.staff.map(s => [s.id, s.name])], at.staff)}</select><button class="btn sm primary" id="aAdd">＋ 打刻を手入力</button></div>`);
      r.querySelector('#aStaff').onchange = e => { at.staff = e.target.value; Admin.refresh(); };
      r.querySelector('#aAdd').onclick = () => punchModal({ staffId: at.staff || d.staff[0].id, date: today, in: '09:00', out: '', breakMin: 0 }, true);
      bar.append(r); main.append(bar);

      const people = d.staff.filter(s => !at.staff || s.id === at.staff);
      // 集計
      const sum = UI.el(`<section class="card"><h2>${U.ymLabel(ym)}の集計</h2><div class="scroll"><table class="tbl"><thead><tr><th>名前</th><th class="r">出勤日数</th><th class="r">実働</th><th class="r">残業</th><th class="r">深夜</th><th class="r">遅刻</th><th class="r">打刻もれ</th></tr></thead><tbody>${people.map(p => {
        const ps = d.punches.filter(x => x.staffId === p.id && x.date.startsWith(ym));
        let w = 0, o = 0, n = 0; ps.forEach(x => { const c = App.Pay.day(x); if (c) { w += c.work; o += c.ot; n += c.night; } });
        const late = ps.filter(x => { const sh = d.shifts.find(s => s.staffId === p.id && s.date === x.date); return sh && x.in && U.toMin(x.in) > U.toMin(sh.start); }).length;
        const miss = ps.filter(x => x.in && !x.out && x.date < today).length + d.shifts.filter(s => s.staffId === p.id && s.date.startsWith(ym) && s.date < today && !ps.some(x => x.date === s.date)).length;
        if (!ps.length && !miss) return '';
        return `<tr><td><i class="dot" style="background:${p.color}"></i>${U.esc(p.name)}</td><td class="r">${ps.filter(x => x.out).length}日</td><td class="r mono">${U.hm(w)}</td><td class="r mono">${U.hm(o)}</td><td class="r mono">${U.hm(n)}</td><td class="r">${late ? `<span class="chip warn">${late}回</span>` : '0回'}</td><td class="r">${miss ? `<span class="chip bad">${miss}件</span>` : '0件'}</td></tr>`;
      }).join('') || '<tr><td colspan="7" class="muted">この月の打刻はありません</td></tr>'}</tbody></table></div></section>`);
      main.append(sum);

      // 明細
      const rows = [];
      U.monthDays(ym).forEach(date => people.forEach(p => {
        const pu = d.punches.find(x => x.staffId === p.id && x.date === date);
        const sh = d.shifts.find(x => x.staffId === p.id && x.date === date);
        if (!pu && !(sh && date <= today)) return;
        rows.push({ date, p, pu, sh });
      }));
      rows.reverse();
      const det = UI.el(`<section class="card"><h2>打刻の明細 <small class="muted">新しい順・行を押すと修正</small></h2><div class="scroll"><table class="tbl hover"><thead><tr><th>日付</th><th>名前</th><th>シフト</th><th>出勤</th><th>退勤</th><th class="r">休憩</th><th class="r">実働</th><th class="r">深夜</th><th>状態</th></tr></thead><tbody>${rows.map((x, i) => {
        const c = App.Pay.day(x.pu);
        let state;
        if (!x.pu) state = x.date === today ? Admin.punchState(null, x.sh, x.date) : ['打刻なし', 'chip bad'];
        else if (!x.pu.out) state = x.date < today ? ['退勤の打刻もれ', 'chip bad'] : Admin.punchState(x.pu, x.sh, x.date);
        else if (x.sh && U.toMin(x.pu.in) > U.toMin(x.sh.start)) state = ['遅刻', 'chip warn'];
        else if (x.sh && U.toMin(x.pu.out) < U.toMin(x.sh.end)) state = ['早退', 'chip warn'];
        else state = ['OK', 'chip good'];
        return `<tr data-i="${i}" tabindex="0"><td class="${U.wdClass(x.date)} nowrap">${U.label(x.date)}</td><td class="nowrap"><i class="dot" style="background:${x.p.color}"></i>${U.esc(x.p.name)}</td><td class="mono">${x.sh ? U.short(x.sh.start) + '-' + U.short(x.sh.end) : '−'}</td><td class="mono">${x.pu?.in || '−'}</td><td class="mono">${x.pu?.out || '−'}</td><td class="r mono">${x.pu ? x.pu.breakMin + '分' : '−'}</td><td class="r mono">${c ? U.hm(c.work) : '−'}</td><td class="r mono">${c && c.night ? U.hm(c.night) : '−'}</td><td><span class="${state[1]}">${state[0]}</span>${x.pu?.edited ? ' <span class="chip">修正済み</span>' : ''}</td></tr>`;
      }).join('') || '<tr><td colspan="9" class="muted">この月の打刻はありません</td></tr>'}</tbody></table></div></section>`);
      det.querySelectorAll('tr[data-i]').forEach(tr => {
        const open = () => { const x = rows[+tr.dataset.i]; x.pu ? punchModal(x.pu, false) : punchModal({ staffId: x.p.id, date: x.date, in: x.sh ? x.sh.start : '09:00', out: x.sh ? x.sh.end : '', breakMin: 0 }, true); };
        tr.onclick = open; tr.onkeydown = e => { if (e.key === 'Enter') open(); };
      });
      main.append(det);
    },
  });
})();
