/* ミセカン 従業員ページ
 * ここでは App.Store を使いません。App.StaffAPI（ログインした本人の分だけ返す窓口）だけを使います。
 * タブ：シフト／給与明細／打刻／従業員名簿（氏名のみ）／掲示板
 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, API = App.StaffAPI;
  const REACTS = ['了解', '👍', '🙋', '❤️'];
  const TABS = [['shift', 'シフト'], ['slip', '給与明細'], ['punch', '打刻'], ['roster', '名簿'], ['board', '掲示板']];
  const ICON = {
    shift: '<path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4"/>',
    slip: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    punch: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    roster: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5a3 3 0 010 6M18 14c2 .6 3 2.6 3 6"/>',
    board: '<path d="M4 5h16v11H8l-4 4z"/>',
  };
  const st = { me: null, tab: 'punch', week: U.monday(U.today()), shiftView: 'mine', slip: '', open: '' };
  const root = () => document.getElementById('appScreen');
  const isBusy = () => document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);

  const Staff = App.Staff = {
    render() {
      const r = root();
      if (st.me) { try { st.me.profile(); } catch (e) { st.me = null; UI.toast('この名前では使えなくなりました。店長に確認してください'); } }
      if (!st.me) return login(r);
      const prof = st.me.profile(), store = st.me.store();
      const unread = st.me.posts().filter(p => !p.read).length;
      r.innerHTML = '';
      r.append(UI.el(`<header class="app-top"><div class="app-id"><span class="logo" aria-hidden="true">M</span><div><small>${U.esc(store.name)}</small><b>${U.esc(prof.name)} さん</b></div></div><button class="btn sm ghost" id="logout">ログアウト</button></header>`));
      r.querySelector('#logout').onclick = () => { st.me = null; Staff.render(); };
      const body = UI.el(`<main class="app-body"><h1 class="app-h1">${TABS.find(t => t[0] === st.tab)[1]}</h1></main>`);
      r.append(body);
      ({ shift, slip, punch, roster, board })[st.tab](body);
      body.append(UI.el(`<p class="privacy small">このページには、あなた本人のシフト・打刻・給与と、在籍している人の氏名だけが表示されます。入力した内容は、勤怠・給与の管理と連絡のためだけに使います。</p>`));
      const nav = UI.el(`<nav class="app-nav" aria-label="メニュー">${TABS.map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}" aria-current="${st.tab === k ? 'page' : 'false'}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${l}${k === 'board' && unread ? `<span class="badge">${unread}</span>` : ''}</button>`).join('')}</nav>`);
      nav.querySelectorAll('button').forEach(b => { b.onclick = () => { st.tab = b.dataset.t; Staff.render(); window.scrollTo(0, 0); }; });
      r.append(nav);
    },
  };

  function login(r) {
    const list = API.loginList();
    const last = App.pref.get('appStaff', list[0]?.id);
    r.innerHTML = `<div class="app-login"><span class="logo big" aria-hidden="true">M</span><h1>従業員ページ</h1><p class="muted">${U.esc(API.storeName())}</p>
      <form id="lg"><label class="field">名前<select id="lgName">${U.options(list.map(s => [s.id, s.name]), last)}</select></label>
      <label class="field">PIN（4桁）<input id="lgPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" required></label>
      <p class="err" id="lgErr" role="alert"></p><button class="btn primary block">ログイン</button></form>
      <p class="muted small">見本のPIN：佐藤 1111、鈴木 2222、高橋 3333、田中 4444、伊藤 5555、渡辺 6666</p></div>`;
    r.querySelector('#lg').onsubmit = e => {
      e.preventDefault();
      const id = r.querySelector('#lgName').value, s = API.login(id, r.querySelector('#lgPin').value);
      if (!s) { r.querySelector('#lgErr').textContent = 'PINが違います。もう一度入力してください。'; return; }
      App.pref.set('appStaff', id); st.me = s; st.tab = 'punch'; Staff.render();
    };
  }

  /* ---------- 打刻 ---------- */
  function punch(el) {
    const me = st.me, today = U.today(), p = me.todayPunch();
    const sh = me.myShifts(today, U.addDays(today, 14)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const todaySh = sh.filter(x => x.date === today), next = sh.find(x => x.date > today);
    const state = !p || !p.in ? 'before' : p.out ? 'done' : p.breakStart ? 'break' : 'working';
    const label = { before: '出勤前', working: '勤務中', break: '休憩中', done: '退勤済み' }[state];
    const btns = { before: [['in', '出勤', 'primary']], working: [['breakStart', '休憩開始', ''], ['out', '退勤', 'dark']], break: [['breakEnd', '休憩終了', 'primary'], ['out', '退勤', 'dark']], done: [] }[state];
    const card = UI.el(`<section class="punch">
      <div class="punch-date">${U.label(today)}</div>
      <div class="punch-clock num" id="clock">${U.nowHHMM()}</div>
      <div class="punch-state state-${state}">${label}</div>
      <div class="punch-btns">${btns.map(([k, l, c]) => `<button class="btn big ${c}" data-p="${k}">${l}</button>`).join('') || '<p class="muted">今日もおつかれさまでした。</p>'}</div>
      <dl class="punch-log"><div><dt>出勤</dt><dd class="num">${p?.in || '−'}</dd></div><div><dt>休憩</dt><dd class="num">${p ? p.breakMin + '分' + (p.breakStart ? '＋' : '') : '−'}</dd></div><div><dt>退勤</dt><dd class="num">${p?.out || '−'}</dd></div></dl>
      <p class="muted small">押した時刻がそのまま記録されます。押し忘れや押し間違いは、店長に伝えて直してもらってください。</p>
    </section>`);
    card.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { const err = me.punch(b.dataset.p); UI.toast(err || `${b.textContent}を記録しました（${U.nowHHMM()}）`); Staff.render(); }; });
    el.append(card);
    el.append(UI.el(`<section class="app-card"><h2>今日のシフト</h2>${todaySh.map(x => `<p class="big-time num">${U.short(x.start)} − ${U.short(x.end)}</p>`).join('') || '<p class="muted">今日はシフトがありません。</p>'}${next ? `<p class="muted small">次のシフト：${U.label(next.date)} ${U.short(next.start)}〜${U.short(next.end)}</p>` : ''}</section>`));
    const unread = me.posts().filter(x => !x.read);
    if (unread.length) {
      const c = UI.el(`<button class="app-card alert"><b>未読のお知らせが${unread.length}件あります</b><span>${U.esc(unread[0].title)}</span></button>`);
      c.onclick = () => { st.tab = 'board'; st.open = unread[0].id; Staff.render(); };
      el.append(c);
    }
  }

  /* ---------- シフト ---------- */
  function shift(el) {
    const me = st.me, store = me.store();
    const seg = UI.el(`<div class="seg full" role="tablist"><button role="tab" data-v="mine" aria-selected="${st.shiftView === 'mine'}">確定したシフト</button><button role="tab" data-v="req" aria-selected="${st.shiftView === 'req'}">希望を出す</button></div>`);
    seg.querySelectorAll('button').forEach(b => { b.onclick = () => { st.shiftView = b.dataset.v; Staff.render(); }; });
    el.append(seg);
    if (st.shiftView === 'mine') {
      const days = [...Array(7)].map((_, i) => U.addDays(st.week, i));
      const sh = me.myShifts(days[0], days[6]);
      el.append(UI.stepper(`${U.label(days[0])}〜${U.label(days[6])}`, () => { st.week = U.addDays(st.week, -7); Staff.render(); }, () => { st.week = U.addDays(st.week, 7); Staff.render(); }));
      const total = U.sum(sh, x => U.toMin(x.end) - U.toMin(x.start));
      el.append(UI.el(`<ul class="day-list">${days.map(dd => { const x = sh.filter(s => s.date === dd); return `<li class="${dd === U.today() ? 'today' : ''}"><span class="${U.wdClass(dd)}">${U.label(dd)}</span>${x.length ? x.map(s => `<b class="num">${U.short(s.start)} − ${U.short(s.end)}</b>`).join('') : '<span class="muted">休み</span>'}</li>`; }).join('')}</ul>`));
      el.append(UI.el(`<p class="muted small center">この週の予定 ${U.hm(total)}（休憩を含む）</p>`));
      return;
    }
    const tl = U.timeOptions(store.open, store.close, store.step);
    const presets = [['09:00', '14:00'], ['10:00', '15:00'], ['12:00', '17:00'], ['14:00', '19:00'], ['17:00', '22:00']];
    const f = UI.el(`<section class="app-card"><h2>シフトの希望を出す</h2><form class="form one">
      <label class="field">日付<input type="date" id="rDate" value="${U.addDays(U.monday(U.today()), 7)}" min="${U.today()}" required></label>
      <div class="two"><label class="field">開始<select id="rStart">${U.options(tl.slice(0, -1), '09:00')}</select></label>
      <label class="field">終了<select id="rEnd">${U.options(tl.slice(1), '14:00')}</select></label></div>
      <div class="chips">${presets.map(([a, b]) => `<button type="button" class="chip-btn" data-a="${a}" data-b="${b}">${U.short(a)}-${U.short(b)}</button>`).join('')}</div>
      <label class="field">ひとこと（任意）<input id="rNote" maxlength="60" placeholder="例：17時までなら入れます"></label>
      <p class="err" id="rErr" role="alert"></p><button class="btn primary block">希望を送る</button></form></section>`);
    f.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => { f.querySelector('#rStart').value = b.dataset.a; f.querySelector('#rEnd').value = b.dataset.b; }; });
    f.querySelector('form').onsubmit = e => {
      e.preventDefault(); const v = id => f.querySelector('#' + id).value;
      const err = me.submitRequest(v('rDate'), v('rStart'), v('rEnd'), v('rNote'));
      if (err) { f.querySelector('#rErr').textContent = err; return; }
      UI.toast(`${U.label(v('rDate'))} の希望を送りました`); Staff.render();
    };
    el.append(f);
    const reqs = me.myRequests().filter(r => r.date >= U.addDays(U.today(), -14));
    const map = { pending: ['返事待ち', 'chip warn'], approved: ['確定', 'chip good'], rejected: ['見送り', 'chip bad'] };
    const list = UI.el(`<section class="app-card"><h2>出した希望</h2><ul class="req-list">${reqs.map(r => `<li><span class="${U.wdClass(r.date)}">${U.label(r.date)}</span><b class="num">${U.short(r.start)}-${U.short(r.end)}</b><span class="${map[r.status][1]}">${map[r.status][0]}</span>${r.status === 'pending' ? `<button class="btn sm ghost" data-c="${r.id}">取り消す</button>` : ''}</li>`).join('') || '<li class="muted">まだ希望を出していません。</li>'}</ul></section>`);
    list.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { me.cancelRequest(b.dataset.c); UI.toast('取り消しました'); Staff.render(); }; });
    el.append(list);
  }

  /* ---------- 給与明細 ---------- */
  function slip(el) {
    const me = st.me, ym = U.ym(U.today()), est = me.estimate(ym), prof = me.profile();
    el.append(UI.el(`<section class="app-card hero"><small>${U.ymLabel(ym)}の見込み（${U.label(U.today())}まで・税金などを引く前）</small><b class="num">${U.yen(est.gross)}</b>
      <dl class="mini-dl"><div><dt>あなたの時給</dt><dd class="num">${U.yen(prof.wage)}</dd></div><div><dt>働いた時間</dt><dd class="num">${U.hm(est.workMin)}</dd></div><div><dt>出勤日数</dt><dd>${est.days}日</dd></div></dl>
      <p class="small">見込みは確定した金額ではありません。月末で締めたあと、店長が確定すると下に明細が出ます。</p></section>`));
    const slips = me.myPayslips();
    if (!slips.length) { el.append(UI.el(`<section class="app-card"><p class="muted">確定した給与明細はまだありません。</p></section>`)); return; }
    if (!slips.some(s => s.ym === st.slip)) st.slip = slips[0].ym;
    const sel = UI.el(`<section class="app-card"><h2>給与明細</h2><select id="slipSel" aria-label="月を選ぶ">${U.options(slips.map(s => [s.ym, U.ymLabel(s.ym) + '分']), st.slip)}</select></section>`);
    sel.querySelector('select').onchange = e => { st.slip = e.target.value; Staff.render(); };
    sel.append(UI.el(App.payslipHtml(slips.find(s => s.ym === st.slip), { employer: me.store().employer })));
    el.append(sel);
    const rec = me.myPunches(st.slip);
    el.append(UI.el(`<section class="app-card"><h2>${U.ymLabel(st.slip)}の勤務記録</h2><ul class="req-list">${rec.map(p => { const c = App.Pay.day(p); return `<li><span class="${U.wdClass(p.date)}">${U.label(p.date)}</span><span class="num">${p.in}〜${p.out || '？'}</span><span class="muted small">休憩${p.breakMin}分</span><b class="num">${c ? U.hm(c.work) : '−'}</b></li>`; }).join('') || '<li class="muted">記録はありません。</li>'}</ul></section>`));
  }

  /* ---------- 従業員名簿（氏名のみ） ---------- */
  function roster(el) {
    const list = st.me.roster();
    el.append(UI.el(`<section class="app-card"><p class="muted small">一緒に働いている人の氏名です。連絡先や時給などの個人情報は表示しません。</p><ul class="roster">${list.map(p => `<li class="${p.me ? 'me' : ''}">${U.esc(p.name)}${p.me ? ' <span class="chip">あなた</span>' : ''}</li>`).join('')}</ul></section>`));
  }

  /* ---------- 掲示板 ---------- */
  function board(el) {
    const me = st.me, posts = me.posts();
    if (!posts.length) { el.append(UI.el(`<p class="muted center">お知らせはありません。</p>`)); return; }
    el.append(UI.el(`<p class="muted small">お知らせを開くと「読んだ」ことが店長に伝わります。リアクションも名前つきで店長に伝わります（ほかの従業員には人数だけが表示されます）。</p>`));
    posts.forEach(p => {
      const open = st.open === p.id;
      const c = UI.el(`<article class="app-card post-m ${p.read ? '' : 'unread'}">
        <button class="post-m-head" aria-expanded="${open}">${p.read ? '' : '<i class="new-dot" aria-label="未読"></i>'}${p.important ? '<span class="chip bad">重要</span>' : ''}<b>${U.esc(p.title)}</b><small class="muted num">${+p.createdAt.slice(5, 7)}/${+p.createdAt.slice(8, 10)}</small></button>
        ${open ? `<p class="post-body">${U.esc(p.body)}</p><div class="react-row">${REACTS.map(e => `<button class="react-btn ${p.mine.includes(e) ? 'on' : ''}" data-e="${U.esc(e)}" aria-pressed="${p.mine.includes(e)}">${U.esc(e)} <span>${p.counts[e] || 0}</span></button>`).join('')}</div>` : ''}
      </article>`);
      c.querySelector('.post-m-head').onclick = () => { st.open = open ? '' : p.id; if (!open) me.markRead(p.id); Staff.render(); };
      c.querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { me.react(p.id, b.dataset.e); Staff.render(); }; });
      el.append(c);
    });
  }

  /* 管理者ページで変更があったら反映（入力中は書き換えない） */
  App.bus.on(kind => { if (kind === 'external' && st.me && !isBusy()) Staff.render(); });
  setInterval(() => { const c = document.getElementById('clock'); if (c) c.textContent = U.nowHHMM(); }, 10000);
  Staff.render();
})();
