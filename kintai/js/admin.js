/* ミセカン 管理画面：タブの仕組み・ホーム・掲示板・従業員名簿・設定 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store;
  const tabs = [];
  const Admin = App.Admin = {
    groups: ['ホーム', '現場', '人事・給与', '売上', 'その他'],
    register(t) { tabs.push(t); },
    current: 'dashboard',
    show(id) {
      if (!tabs.some(t => t.id === id)) id = 'dashboard';
      Admin.current = id; Admin.renderNav(); Admin.renderMain();
    },
    renderNav() {
      const nav = document.getElementById('sideNav');
      nav.innerHTML = Admin.groups.map(g => {
        const ts = tabs.filter(t => t.group === g); if (!ts.length) return '';
        return `<div class="nav-group"><div class="nav-title">${g}</div>${ts.map(t => {
          const b = t.badge ? t.badge() : 0;
          return `<a href="#${t.id}" class="nav-item${t.id === Admin.current ? ' on' : ''}" aria-current="${t.id === Admin.current ? 'page' : 'false'}">${t.label}${b ? `<span class="badge">${b}</span>` : ''}</a>`;
        }).join('')}</div>`;
      }).join('');
      document.getElementById('storeName').textContent = S.get().settings.storeName;
    },
    renderMain() {
      const t = tabs.find(x => x.id === Admin.current);
      const main = document.getElementById('adminMain');
      main.innerHTML = '';
      main.append(UI.el(`<div class="page-head"><h1>${t.label}</h1>${t.lead ? `<p class="lead">${t.lead}</p>` : ''}</div>`));
      const src = Admin.SOURCES[t.id];
      if (src) {
        const bar = UI.el(`<div class="sources" aria-label="このページのデータの出どころ"><span class="sources-title">データの出どころ</span>${src.map(([to, what, who]) =>
          to === 'self' ? `<button type="button" class="src-chip self" data-jump>${what}<small>${who}</small><span aria-hidden="true">↓</span></button>`
          : to === 'staffpage' ? `<span class="src-chip staffp">${what}<small>${who}</small></span>`
          : `<a class="src-chip" href="#${to}">${what}<small>${who}</small><span aria-hidden="true">→</span></a>`).join('')}</div>`);
        bar.querySelectorAll('[data-jump]').forEach(btn => { btn.onclick = () => { const f = main.querySelector('[data-input]'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'start' }); const i = f.querySelector('input:not([type=checkbox]),select,textarea,button'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 300); } }; });
        main.append(bar);
      }
      t.render(main);
    },
    refresh() { Admin.renderNav(); Admin.renderMain(); },
  };
  /* 各タブの数字が、どこで入力したデータから来ているか。
   * [行き先のタブ, データの名前, 誰が入力するか]。行き先 'self' はこのページの入力欄、'staffpage' は従業員ページ */
  Admin.SOURCES = {
    dashboard: [['sales', '売上', '管理者が「毎日の売上」で入力'], ['attendance', '出勤・打刻', '従業員が打刻／管理者が修正'], ['shift', 'シフト', '管理者が「シフト」で作成'], ['staff', '時給', '管理者が「従業員名簿」で入力'], ['board', 'お知らせ', '管理者が「掲示板」で入力']],
    legal: [['attendance', '打刻', '従業員が打刻／管理者が修正'], ['staff', '名簿・時給・生年月日', '管理者が入力'], ['config', '最低賃金・36協定・税', '管理者が「設定」で入力']],
    board: [['self', 'お知らせ', 'このページで管理者が書く・直す'], ['staffpage', '既読・リアクション', '従業員ページで本人が押す']],
    shift: [['self', 'シフト', 'このページで管理者が作成・変更'], ['staffpage', 'シフト希望', '従業員ページで本人が提出']],
    attendance: [['staffpage', '打刻', '従業員ページで本人が押す'], ['self', '打刻の手入力・修正', 'このページで管理者が入力（理由が必須）']],
    staff: [['self', '従業員の情報・時給・保険・税・連絡先', 'このページで管理者が入力']],
    payroll: [['attendance', '労働時間', '打刻から計算'], ['staff', '時給・交通費・保険・扶養', '従業員名簿'], ['config', '割増率・保険料率・税', '設定']],
    payslip: [['payroll', '確定した給与', '「給与計算」で確定したもの']],
    ledger: [['payroll', '確定した給与', '「給与計算」で確定したもの'], ['staff', '性別・業務', '従業員名簿']],
    tax: [['payroll', '確定した給与', '「給与計算」で確定したもの'], ['staff', '税区分・扶養', '従業員名簿']],
    mail: [['self', '送信の設定', 'このページで管理者が入力'], ['staff', 'メールアドレス・同意', '従業員名簿'], ['payroll', '給与明細', '確定した給与'], ['attendance', '勤怠', '打刻'], ['shift', 'シフト', '確定したシフト']],
    sales: [['self', '売上（レジ締めの合計・客数）', 'このページで管理者が入力'], ['purchases', '商品ごとの明細', '「購買履歴」で入力']],
    purchases: [['self', '商品ごとの販売記録・商品マスタ', 'このページで管理者が入力'], ['sales', '売上の合計', '「毎日の売上」で入力']],
    config: [['self', '店舗・計算・法令の数値', 'このページで管理者が入力']],
  };

  App.bus.on(kind => {
    if (!document.getElementById('adminMain')) return;
    Admin.renderNav();
    // 従業員ページでの打刻・希望などを反映。入力中・確認画面を開いているときは書き換えない
    const busy = document.querySelector('.modal-back') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
    if (kind === 'external' && !busy) Admin.renderMain();
  });

  /* 打刻の状態 */
  Admin.punchState = function (p, shift, date) {
    const now = U.toMin(U.nowHHMM());
    if (p && p.out) return ['退勤済み', 'chip'];
    if (p && p.breakStart) return ['休憩中', 'chip warn'];
    if (p && p.in) return [shift && U.toMin(p.in) > U.toMin(shift.start) ? '出勤中（遅刻）' : '出勤中', shift && U.toMin(p.in) > U.toMin(shift.start) ? 'chip warn' : 'chip good'];
    if (shift && date === U.today() && now > U.toMin(shift.start)) return ['未出勤', 'chip bad'];
    if (shift && date < U.today()) return ['打刻なし', 'chip bad'];
    return ['出勤前', 'chip'];
  };

  /* ================= ホーム ================= */
  Admin.register({
    id: 'dashboard', label: 'ホーム', group: 'ホーム', lead: '今日の店の状況をひと目で確認します。',
    render(main) {
      const d = S.get(), today = U.today(), ym = U.ym(today), yest = U.addDays(today, -1);
      const salesM = U.sum(d.sales.filter(s => s.date.startsWith(ym)), s => s.amount);
      const lastYm = U.ymAdd(ym, -12);
      const dayN = +yest.slice(8, 10);
      const salesLY = U.sum(d.sales.filter(s => s.date.startsWith(lastYm) && +s.date.slice(8, 10) <= dayN), s => s.amount);
      const ySales = d.sales.find(s => s.date === yest);
      const labor = U.sum(d.staff.filter(s => s.active), st => App.Pay.month(st, ym, d).gross);
      const ratio = salesM ? labor / salesM * 100 : 0;
      const todayShifts = d.shifts.filter(s => s.date === today).sort((a, b) => U.toMin(a.start) - U.toMin(b.start));
      const working = d.punches.filter(p => p.date === today && p.in && !p.out).length;
      const pending = d.requests.filter(r => r.status === 'pending').length;
      const diff = salesLY ? (salesM / salesLY - 1) * 100 : 0;

      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">昨日の売上</span><b class="tile-num">${ySales ? U.yen(ySales.amount) : '未入力'}</b><span class="tile-sub">${ySales ? `客数 ${ySales.customers}人 ・ 客単価 ${U.yen(ySales.amount / Math.max(1, ySales.customers))}` : '<span class="chip warn">まだ入力されていません</span>'}</span><a class="src-link" href="#sales">入力：毎日の売上 →</a></div>
        <div class="tile"><span class="tile-label">今月の売上（${+ym.slice(5)}/1〜昨日）</span><b class="tile-num">${U.yen(salesM)}</b><span class="tile-sub"><span class="chip ${diff >= 0 ? 'good' : 'bad'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%</span> 前年同期比</span><a class="src-link" href="#sales">入力：毎日の売上 →</a></div>
        <div class="tile"><span class="tile-label">今月の人件費（見込み）</span><b class="tile-num">${U.yen(labor)}</b><span class="tile-sub"><span class="chip ${ratio <= d.settings.laborTarget ? 'good' : 'warn'}">人件費率 ${ratio.toFixed(1)}%</span> 目標 ${d.settings.laborTarget}%</span><a class="src-link" href="#attendance">打刻×時給（勤怠・従業員名簿）→</a></div>
        <div class="tile"><span class="tile-label">今日の出勤</span><b class="tile-num">${todayShifts.length}人<small> / 出勤中 ${working}人</small></b><span class="tile-sub">${pending ? `<a href="#shift" class="chip warn">シフト希望 ${pending}件が未承認</a>` : '未承認のシフト希望はありません'}</span><a class="src-link" href="#shift">シフト・打刻 →</a></div>
      </section>`));

      if (App.Legal) {
        const iss = App.Legal.issues(d), bad = iss.filter(i => i.level === 'bad'), warn = iss.filter(i => i.level === 'warn');
        main.append(UI.el(`<section class="card legal-sum ${bad.length ? 'has-bad' : ''}"><div class="card-head"><h2>法令チェック</h2><a class="btn sm" href="#legal">すべて見る</a></div>
          ${bad.length + warn.length ? `<ul class="issues compact">${[...bad, ...warn].slice(0, 3).map(i => `<li class="issue ${i.level}"><span class="chip ${i.level}">${i.level === 'bad' ? 'すぐ対応' : '確認'}</span><div><b>${U.esc(i.title)}</b><small class="muted">${U.esc(i.law)}</small></div></li>`).join('')}</ul>${bad.length + warn.length > 3 ? `<p class="muted small">ほか ${bad.length + warn.length - 3} 件</p>` : ''}` : '<p class="muted">すぐ対応が必要なこと・確認が必要なことは見つかっていません（数値の確認のお知らせは「法令チェック」に出ています）。</p>'}</section>`));
      }
      const grid = UI.el(`<div class="grid-2"></div>`);
      const now = UI.el(`<section class="card"><h2>今日の出勤状況 <small class="muted">${U.label(today)}</small></h2><div class="scroll"><table class="tbl"><thead><tr><th>名前</th><th>シフト</th><th>出勤</th><th>退勤</th><th>状態</th></tr></thead><tbody>${todayShifts.map(s => {
        const st = S.staff(s.staffId) || { name: '(削除済み)', color: '#888' };
        const p = d.punches.find(x => x.staffId === s.staffId && x.date === today);
        const [lab, cls] = Admin.punchState(p, s, today);
        return `<tr><td><i class="dot" style="background:${st.color}"></i>${U.esc(st.name)}</td><td class="mono">${U.short(s.start)}-${U.short(s.end)}</td><td class="mono">${p && p.in ? p.in : '−'}</td><td class="mono">${p && p.out ? p.out : '−'}</td><td><span class="${cls}">${lab}</span></td></tr>`;
      }).join('') || '<tr><td colspan="5" class="muted">今日のシフトはありません</td></tr>'}</tbody></table></div></section>`);
      grid.append(now);

      const board = UI.el(`<section class="card"><h2>掲示板の既読</h2><ul class="plain">${d.posts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map(p => {
        const n = d.staff.filter(s => s.active).length, r = d.reads.filter(x => x.postId === p.id && S.staff(x.staffId)?.active).length;
        return `<li><a href="#board">${U.esc(p.title)}</a><span class="meter"><i style="width:${n ? r / n * 100 : 0}%"></i></span><span class="mono">${r}/${n}</span></li>`;
      }).join('')}</ul></section>`);
      grid.append(board);
      main.append(grid);

      const months = []; for (let i = 11; i >= 0; i--) months.push(U.ymAdd(ym, -i));
      const card = UI.el(`<section class="card"><h2>月別の売上 <small class="muted">直近12か月・今月は昨日まで</small></h2></section>`);
      card.append(App.Chart.bars(months.map(m => ({ label: `${+m.slice(5)}月`, tip: U.ymLabel(m), value: U.sum(d.sales.filter(s => s.date.startsWith(m)), s => s.amount) })),
        { fmt: U.yen, fmtAxis: v => (v / 10000).toLocaleString('ja-JP') + '万', label: '月別の売上' }));
      main.append(card);
    },
  });

  /* ================= 掲示板 ================= */
  Admin.register({
    id: 'board', label: '掲示板', group: '現場', lead: 'お知らせを書くと、従業員ページに届きます。誰が読んだか・リアクションも確認できます。',
    badge() { const d = S.get(); const n = d.staff.filter(s => s.active); return d.posts.filter(p => p.important && n.some(s => !d.reads.some(r => r.postId === p.id && r.staffId === s.id))).length; },
    render(main) {
      const d = S.get();
      const form = UI.el(`<section class="card input-card" data-input><h2>お知らせを書く</h2>
        <form class="form" id="postForm">
          <label class="field wide">タイトル<input id="pTitle" required maxlength="60" placeholder="例：12月のシフト提出のお願い"></label>
          <label class="field wide">本文<textarea id="pBody" rows="4" required placeholder="従業員に伝えたいことを書きます"></textarea></label>
          <label class="check"><input type="checkbox" id="pImp"> 重要（未読の人をホームで知らせる）</label>
          <label class="check"><input type="checkbox" id="pPin"> 一番上に固定</label>
          <button class="btn primary">投稿する</button>
        </form></section>`);
      form.querySelector('form').onsubmit = e => {
        e.preventDefault();
        d.posts.push({ id: U.uid(), title: form.querySelector('#pTitle').value.trim(), body: form.querySelector('#pBody').value.trim(), important: form.querySelector('#pImp').checked, pinned: form.querySelector('#pPin').checked, createdAt: new Date().toISOString().slice(0, 19) });
        S.save(); UI.toast('投稿しました'); Admin.refresh();
      };
      main.append(form);

      const active = d.staff.filter(s => s.active);
      d.posts.slice().sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt)).forEach(p => {
        const readers = active.filter(s => d.reads.some(r => r.postId === p.id && r.staffId === s.id));
        const unread = active.filter(s => !readers.includes(s));
        const rs = d.reactions.filter(r => r.postId === p.id);
        const byEmoji = {}; rs.forEach(r => { (byEmoji[r.emoji] = byEmoji[r.emoji] || []).push(S.staff(r.staffId)?.name || '?'); });
        const card = UI.el(`<article class="card post">
          <div class="post-head"><h3>${p.pinned ? '<span class="chip">固定</span> ' : ''}${p.important ? '<span class="chip bad">重要</span> ' : ''}${U.esc(p.title)}</h3><span class="muted num">${p.createdAt.slice(0, 16).replace('T', ' ')}${p.editedAt ? '（編集済み）' : ''}</span></div>
          <p class="post-body">${U.esc(p.body)}</p>
          <div class="post-stats">
            <div><b>既読 ${readers.length}/${active.length}</b><span class="meter"><i style="width:${active.length ? readers.length / active.length * 100 : 0}%"></i></span></div>
            <div class="reacts">${Object.entries(byEmoji).map(([e, names]) => `<span class="react" title="${U.esc(names.join('、'))}">${U.esc(e)} ${names.length}<small>${U.esc(names.map(n => n.split(' ')[0]).join('・'))}</small></span>`).join('') || '<span class="muted">リアクションはまだありません</span>'}</div>
          </div>
          <details><summary>読んだ人・まだの人</summary><div class="who">
            <div><b>読んだ人</b> ${readers.map(s => `<span class="chip good">${U.esc(s.name)}</span>`).join('') || '<span class="muted">なし</span>'}</div>
            <div><b>まだの人</b> ${unread.map(s => `<span class="chip bad">${U.esc(s.name)}</span>`).join('') || '<span class="muted">全員読みました</span>'}</div></div></details>
          <div class="row-end"><button class="btn sm" data-edit>編集</button><button class="btn sm" data-pin>${p.pinned ? '固定をはずす' : '一番上に固定'}</button><button class="btn sm danger" data-del>削除</button></div>
        </article>`);
        card.querySelector('[data-pin]').onclick = () => { p.pinned = !p.pinned; S.save(); Admin.refresh(); };
        card.querySelector('[data-edit]').onclick = () => UI.modal('お知らせを編集', `<form class="form one">
            <label class="field">タイトル<input id="e_t" value="${U.esc(p.title)}" maxlength="60"></label>
            <label class="field">本文<textarea id="e_b" rows="5">${U.esc(p.body)}</textarea></label>
            <label class="check"><input type="checkbox" id="e_i" ${p.important ? 'checked' : ''}> 重要</label>
            <p class="muted small">すでに読んだ人の既読はそのまま残ります。大事な変更のときは、新しいお知らせとして出し直すと全員にもう一度読んでもらえます。</p><p class="err" id="e_err"></p></form>`,
          [{ label: 'やめる' }, { label: '保存する', kind: 'primary', onClick: w => {
            const t = w.querySelector('#e_t').value.trim(), bd = w.querySelector('#e_b').value.trim();
            if (!t || !bd) { w.querySelector('#e_err').textContent = 'タイトルと本文を入れてください。'; return false; }
            p.title = t; p.body = bd; p.important = w.querySelector('#e_i').checked; p.editedAt = new Date().toISOString().slice(0, 16);
            S.save(); UI.toast('お知らせを直しました'); Admin.refresh();
          } }]);
        card.querySelector('[data-del]').onclick = async () => {
          if (!await UI.confirm(`「${p.title}」を削除します。既読とリアクションも消えます。`, '削除する', true)) return;
          d.posts = d.posts.filter(x => x !== p); d.reads = d.reads.filter(x => x.postId !== p.id); d.reactions = d.reactions.filter(x => x.postId !== p.id);
          S.save(); Admin.refresh();
        };
        main.append(card);
      });
    },
  });

  /* ================= 従業員名簿（労働者名簿） ================= */
  // 労働基準法107条・施行規則53条で記入が決まっている項目には「法定」の印を付けます
  const SECTIONS = [
    ['基本', [
      ['code', '従業員番号', 'text'], ['name', '氏名', 'text', 'law', true], ['kana', 'ふりがな', 'text'],
      ['gender', '性別', 'select:女性,男性,その他', 'law'], ['birth', '生年月日', 'date', 'law'],
      ['address', '住所', 'text', 'law'], ['phone', '電話番号', 'tel'],
    ]],
    ['雇用', [
      ['hireDate', '雇入れ年月日', 'date', 'law'], ['job', '従事する業務の種類', 'text', 'law'],
      ['role', '役割', 'text'], ['history', '履歴（前職・資格など）', 'text', 'law'],
    ]],
    ['給与・保険・税', [
      ['wage', '時給（円）', 'number', '', true], ['transport', '交通費（1日・円）', 'number'],
      ['dependents', '扶養人数', 'number'], ['socialIns', '社会保険料（月額・手入力）', 'number'],
      ['taxCol', '税額表の区分', 'select:甲,乙'],
    ]],
    ['従業員ページ・メール', [
      ['pin', '従業員ページの暗証番号（4桁）', 'text', '', true], ['email', 'メールアドレス', 'email'],
      ['consentDate', '電子交付に同意した日', 'date'],
    ]],
    ['退職・死亡（該当するときだけ）', [
      ['retireDate', '退職年月日', 'date', 'law'], ['retireReason', '退職の事由（解雇の場合はその理由）', 'text', 'law'],
      ['deathDate', '死亡年月日', 'date', 'law'], ['deathCause', '死亡の原因', 'text', 'law'],
    ]],
  ];
  const ALL = SECTIONS.flatMap(s => s[1]);
  function inputHtml([k, l, t, law, req], st) {
    const lab = `${l}${law ? ' <span class="law-tag">法定</span>' : ''}${req ? ' <span class="req">必須</span>' : ''}`;
    if (t.startsWith('select:')) return `<label class="field">${lab}<select id="f_${k}">${U.options([...(k === 'gender' ? [['', '（未記入）']] : []), ...t.slice(7).split(',').map(x => [x, x])], st[k] || '')}</select></label>`;
    return `<label class="field">${lab}<input id="f_${k}" type="${t}" value="${U.esc(st[k] ?? '')}"${t === 'number' ? ' min="0" step="1"' : ''}${k === 'pin' ? ' inputmode="numeric" maxlength="4"' : ''}></label>`;
  }
  function staffForm(st, isNew) {
    const s = S.get().settings;
    const html = `<p class="err form-err" id="f_err" role="alert"></p><p class="muted small"><span class="req">必須</span> の3つ（氏名・時給・暗証番号）を入れれば登録できます。<span class="law-tag">法定</span> の項目は労働者名簿に必要なので、わかりしだい入れてください（未記入は「法令チェック」に出ます）。</p><form class="form" novalidate>${SECTIONS.map(([title, fs]) => `<h4 class="wide form-sec">${title}</h4>${fs.map(f => inputHtml(f, st)).join('')}${title === '給与・保険・税' ? `
      <label class="check wide"><input type="checkbox" id="f_empIns" ${st.empIns ? 'checked' : ''}> 雇用保険に加入（週20時間以上・31日以上の雇用見込み）</label>
      <p class="wide small muted">最低賃金（${U.esc(s.minWagePref)}）：${U.yen(s.minWage)}。これより低い時給は保存できません（最低賃金法4条）。</p>` : ''}${title === '従業員ページ・メール' ? `
      <label class="check wide"><input type="checkbox" id="f_consent" ${st.consent ? 'checked' : ''}> 給与明細をメール（電子）で受け取ることに本人が同意している</label>
      <p class="wide small muted">給与明細を電子で渡すには、本人の承諾が必要です（所得税法231条2項・同施行令356条）。同意がない人には紙で渡してください。</p>` : ''}`).join('')}
      <label class="field">表示の色<input id="f_color" type="color" value="${st.color}"></label>
      <label class="check"><input type="checkbox" id="f_active" ${st.active ? 'checked' : ''}> 在籍中</label>
      <label class="field wide">メモ（管理者だけが見られます）<textarea id="f_note" rows="2">${U.esc(st.note)}</textarea></label></form>`;
    UI.modal(isNew ? '従業員を追加' : `${st.name} さんの情報`, html, [
      { label: 'やめる' },
      { label: '保存する', kind: 'primary', onClick: w => {
        const v = id => w.querySelector('#f_' + id), err = w.querySelector('#f_err');
        w.querySelectorAll('.bad-input').forEach(x => x.classList.remove('bad-input'));
        const fail = (msg, id) => { err.textContent = msg; if (id) { v(id).classList.add('bad-input'); v(id).focus({ preventScroll: true }); } w.querySelector('.modal-body').scrollTop = 0; return false; };
        const name = v('name').value.trim(), wage = Number(v('wage').value || 0), pin = v('pin').value.trim(), email = v('email').value.trim();
        if (!name) return fail('氏名を入れてください。', 'name');
        if (S.get().staff.some(x => x.name === name && x.id !== st.id)) return fail('同じ氏名の人がいます。従業員ページのログインで区別できるよう、名前の書き方を変えてください（例：山田 花子（夜））。', 'name');
        if (!wage) return fail('時給を入れてください。', 'wage');
        if (wage < s.minWage) return fail(`時給が最低賃金（${s.minWagePref} ${U.yen(s.minWage)}）より低くなっています（最低賃金法4条）。`, 'wage');
        if (!/^[0-9]{4}$/.test(pin)) return fail('暗証番号は数字4桁で入れてください。', 'pin');
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('メールアドレスの形が正しくありません。', 'email');
        if (v('consent').checked && !email) return fail('電子交付に同意している場合は、メールアドレスを入れてください。', 'email');
        if (v('consent').checked && !v('consentDate').value) return fail('同意した日を入れてください（同意の記録として残します）。', 'consentDate');
        if (!v('active').checked && !v('retireDate').value && !v('deathDate').value) return fail('在籍中を外すときは、退職年月日を入れてください（労働者名簿の記入事項）。', 'retireDate');
        const before = JSON.stringify({ wage: st.wage, active: st.active });
        ALL.forEach(([k, , t]) => { st[k] = t === 'number' ? Number(v(k).value || 0) : v(k).value.trim(); });
        st.color = v('color').value; st.empIns = v('empIns').checked; st.active = v('active').checked; st.note = v('note').value; st.consent = v('consent').checked;
        const d = S.get(); if (isNew) d.staff.push(st);
        S.log('管理者', isNew ? '従業員を追加' : '従業員情報を変更', st.name, isNew ? '' : `変更前 ${before}`);
        S.save();
        const miss = ALL.filter(f => f[3] === 'law' && ['gender', 'birth', 'address', 'hireDate'].includes(f[0]) && !st[f[0]]).map(f => f[1]);
        UI.toast(`${isNew ? '登録' : '保存'}しました${miss.length ? `（労働者名簿の未記入：${miss.join('・')}）` : ''}`); Admin.refresh();
      } },
    ]);
  }
  Admin.register({
    id: 'staff', label: '従業員名簿', group: '人事・給与', lead: '労働者名簿（労働基準法107条）を兼ねています。行を押すと編集できます。退職した人も記録の保存期間中は削除せず「退職」として残します。',
    render(main) {
      const d = S.get(), s = d.settings;
      const bar = UI.el(`<div class="toolbar input-bar" data-input><button class="btn primary">＋ 従業員を追加</button><span class="muted">在籍 ${d.staff.filter(x => x.active).length}人 ・ 退職 ${d.staff.filter(x => !x.active).length}人</span></div>`);
      bar.querySelector('button').onclick = () => staffForm({ id: 'st' + U.uid(), code: 'S' + String(d.staff.length + 1).padStart(3, '0'), name: '', kana: '', gender: '', birth: '', address: '', phone: '', hireDate: U.today(), job: '接客・調理補助', role: 'アルバイト', history: '', wage: Math.max(s.minWage, 1230), transport: 0, dependents: 0, socialIns: 0, taxCol: '甲', empIns: false, pin: String(1000 + Math.floor(Math.random() * 9000)), email: '', consent: false, consentDate: '', retireDate: '', retireReason: '', deathDate: '', deathCause: '', active: true, note: '', color: '#c2185b' }, true);
      main.append(bar);
      const missing = st => ALL.filter(f => ['name', 'gender', 'birth', 'address', 'hireDate'].includes(f[0]) && !st[f[0]]).map(f => f[1]);
      const card = UI.el(`<section class="card"><div class="scroll"><table class="tbl hover"><thead><tr><th>番号</th><th>氏名</th><th>性別</th><th>雇入れ日</th><th>業務</th><th class="r">時給</th><th>雇用保険</th><th>税区分</th><th>メール・電子交付</th><th>名簿の記入</th><th>状態</th></tr></thead><tbody>${d.staff.map(x => {
        const miss = missing(x);
        return `<tr data-id="${x.id}" tabindex="0">
        <td class="num">${U.esc(x.code)}</td><td><i class="dot" style="background:${x.color}"></i><b>${U.esc(x.name)}</b><br><small class="muted">${U.esc(x.kana)}</small></td><td>${U.esc(x.gender)}</td><td class="num">${U.esc(x.hireDate)}</td><td>${U.esc(x.job)}</td>
        <td class="r num">${U.yen(x.wage)}${x.wage < s.minWage ? '<br><span class="chip bad">最低賃金未満</span>' : ''}</td><td>${x.empIns ? '<span class="chip good">加入</span>' : '<span class="chip">なし</span>'}</td><td>${x.taxCol}欄</td>
        <td>${x.email ? (x.consent ? '<span class="chip good">同意あり</span>' : '<span class="chip warn">同意なし（紙で交付）</span>') : '<span class="chip">未登録</span>'}</td>
        <td>${miss.length ? `<span class="chip bad" title="${U.esc(miss.join('、'))}">未記入 ${miss.length}項目</span>` : '<span class="chip good">そろっています</span>'}</td>
        <td>${x.active ? '<span class="chip good">在籍</span>' : `<span class="chip">退職 ${U.esc(x.retireDate)}</span>`}</td></tr>`;
      }).join('')}</tbody></table></div>
      <p class="muted small">労働者名簿は、退職・死亡の日から5年間（当分の間は3年間）保存する義務があります（労働基準法109条・143条）。生年月日・住所・メールアドレスなどの個人情報は管理者ページだけに表示し、従業員ページには氏名だけを出します。</p></section>`);
      card.querySelectorAll('tr[data-id]').forEach(tr => {
        const open = () => staffForm(S.staff(tr.dataset.id), false);
        tr.onclick = open; tr.onkeydown = e => { if (e.key === 'Enter') open(); };
      });
      main.append(card);
    },
  });

  /* ================= 設定 ================= */
  Admin.register({
    id: 'config', label: '設定・データ', group: 'その他', lead: '店舗の情報、法令に関わる数値（最低賃金・割増率・保険料率・税）、管理者の暗証番号、データのバックアップを扱います。',
    render(main) {
      const d = S.get(), s = d.settings, t = s.tax;
      const tbl = a => a.map(r => [r[0] === Infinity ? null : r[0], r[1], r[2]]);
      const SEC = [
        ['データの保存場所', 'この端末のブラウザの中だけ。入力したデータはインターネットには送っていません（文字の形＝フォントだけGoogleから読み込みます）。', 'クラウドのサーバーに保存し、通信はすべて暗号化（HTTPS）'],
        ['管理者ページの鍵', '暗証番号。5回続けて間違えると5分ロック。15分操作がないと自動でロック。', 'メールアドレス＋パスワード＋2段階認証'],
        ['従業員のログイン', '名前＋4桁の暗証番号。5回続けて間違えると5分ロック。10分操作がないと自動でログアウト。', '1人ずつのアカウント（メールやLINEでのログイン）'],
        ['本人以外のデータ', '従業員ページの画面には出しません。ただし同じブラウザの中に全員分のデータがあり、パソコンに詳しい人なら開発者ツールで見られます。', 'サーバーが本人の分だけを送る（データベースの権限設定）'],
        ['暗証番号の保存', '暗号化せずに保存しています。', '元に戻せない形（ハッシュ）にして保存'],
        ['バックアップ', '下の「バックアップ」の文字には個人情報がすべて入っています。メールやLINEで送らないでください。', '暗号化した自動バックアップ'],
        ['操作の記録', '打刻の修正・給与の確定・設定の変更などを記録しています。', 'すべての閲覧と変更を記録'],
        ['確認用のリンク', '誰が開けるかは、ページの「共有」メニューの設定で決まります（非公開にすると、あなただけが開けます）。開いた人ごとにデータは別々で、ほかの人が入力した内容は見えません。', '本番用の専用アドレスと利用者の管理'],
      ];
      main.append(UI.el(`<section class="card sec-card"><h2>セキュリティ（試作版の今の状態）</h2>
        <p class="notice">結論：データはどこにも送っていないので、インターネットに漏れる作りではありません。ただし、本物の個人情報を入れて使えるほどの守りはまだありません。<b>試作版には本物の従業員の住所・生年月日・メールアドレスなどを入れないでください。</b></p>
        <div class="scroll"><table class="tbl"><thead><tr><th>項目</th><th>試作版（今）</th><th>本番で必要な対策</th></tr></thead><tbody>${SEC.map(([k, now, prod]) => `<tr><th class="nowrap">${k}</th><td>${now}</td><td>${prod}</td></tr>`).join('')}</tbody></table></div></section>`));
      const card = UI.el(`<section class="card input-card" data-input><h2>店舗と計算の設定</h2><form class="form" id="cfg">
        <label class="field wide">店舗名<input id="c_storeName" value="${U.esc(s.storeName)}" required></label>
        <label class="field wide">事業者名（給与明細・源泉徴収票に表示）<input id="c_employer" value="${U.esc(s.employer)}" required></label>
        <label class="field">営業開始（時）<input id="c_openHour" type="number" min="0" max="23" value="${s.openHour}"></label>
        <label class="field">営業終了（時）<input id="c_closeHour" type="number" min="1" max="29" value="${s.closeHour}"></label>
        <label class="field">シフトの刻み（分）<select id="c_step">${U.options([['15', '15分'], ['30', '30分'], ['60', '60分']], String(s.step))}</select></label>
        <label class="field">必要人数（初期値）<input id="c_need" type="number" min="0" value="${s.need}"></label>
        <label class="field">給料日（毎月・月末締め）<input id="c_payDay" type="number" min="1" max="31" value="${s.payDay}"></label>
        <label class="field">人件費率の目標（%）<input id="c_laborTarget" type="number" min="0" max="100" value="${s.laborTarget}"></label>
        <label class="field">管理者ページの暗証番号<input id="c_adminPin" value="${U.esc(s.adminPin)}" pattern="[0-9]{4,8}" inputmode="numeric" title="数字4〜8桁"></label>

        <h3 class="wide form-sec">労働時間・割増賃金（労働基準法32条・37条）</h3>
        <label class="field">週の始まり（週40時間の数え方）<select id="c_weekStart">${U.options([['0', '日曜日'], ['1', '月曜日'], ['6', '土曜日']], String(s.weekStart))}</select></label>
        <label class="field">時間外の割増率（25%以上）<input id="c_otRate" type="number" step="0.01" min="1.25" value="${s.otRate}"></label>
        <label class="field">月60時間超の割増率（50%以上）<input id="c_ot60Rate" type="number" step="0.01" min="1.5" value="${s.ot60Rate}"></label>
        <label class="field">深夜（22〜5時）の割増率（25%以上）<input id="c_nightRate" type="number" step="0.01" min="1.25" value="${s.nightRate}"></label>
        <label class="check wide"><input type="checkbox" id="c_agreement36" ${s.agreement36 ? 'checked' : ''}> 36協定（時間外・休日労働に関する協定）を労働基準監督署に届け出ている</label>
        <label class="field">36協定：月の上限（時間）<input id="c_limitMonth" type="number" min="0" max="45" value="${s.limitMonth}"></label>
        <label class="field">36協定：年の上限（時間）<input id="c_limitYear" type="number" min="0" max="360" value="${s.limitYear}"></label>

        <h3 class="wide form-sec">最低賃金・雇用保険</h3>
        <label class="field">最低賃金の都道府県<input id="c_minWagePref" value="${U.esc(s.minWagePref)}"></label>
        <label class="field">地域別最低賃金（時間額・円）<input id="c_minWage" type="number" min="0" value="${s.minWage}"></label>
        <label class="field wide">最低賃金のメモ<input id="c_minWageNote" value="${U.esc(s.minWageNote)}"></label>
        <label class="field">雇用保険料率（労働者負担）<input id="c_empInsRate" type="number" step="0.0001" min="0" value="${s.empInsRate}"></label>
        <label class="field wide">雇用保険料率のメモ<input id="c_empInsNote" value="${U.esc(s.empInsNote)}"></label>

        <h3 class="wide form-sec">源泉所得税（月額表・電算機計算の特例）</h3>
        <p class="wide notice">今の数値：${U.esc(t.version)}。令和8年分（2026年1月以降の支払い）から税額表が改正されています。本番で使う前に、国税庁の最新の「源泉徴収税額表」で必ず確認してください。</p>
        <label class="field">甲欄：この金額未満は0円<input id="t_zeroBelow" type="number" value="${t.zeroBelow}"></label>
        <label class="field">基礎控除（月額）<input id="t_kiso" type="number" value="${t.kiso}"></label>
        <label class="field">扶養1人あたりの控除（月額）<input id="t_fuyo" type="number" value="${t.fuyo}"></label>
        <label class="field">乙欄：一律の率<input id="t_otsuRate" type="number" step="0.00001" value="${t.otsuRate}"></label>
        <details class="wide"><summary>詳しい人向け：給与所得控除・税率の表を直接直す</summary><label class="field">表のデータ（上限がない行は null と書きます）<textarea id="t_tables" rows="5" class="mono">${U.esc(JSON.stringify({ kyuyo: tbl(t.kyuyo), brackets: tbl(t.brackets) }))}</textarea></label></details>
        <p class="wide err" id="c_err" role="alert"></p>
        <div class="wide row-end"><button type="button" class="btn" id="taxReset">税の数値を初期値に戻す</button><button class="btn primary">設定を保存</button></div>
      </form></section>`);
      card.querySelector('form').onsubmit = e => {
        e.preventDefault();
        const v = id => card.querySelector('#' + id).value, err = card.querySelector('#c_err');
        let tb; try { tb = JSON.parse(v('t_tables')); if (!Array.isArray(tb.kyuyo) || !Array.isArray(tb.brackets)) throw 0; } catch (x) { err.textContent = '税の表の書き方が正しくありません。JSONの形を確認してください。'; return; }
        if (Number(v('c_otRate')) < 1.25 || Number(v('c_nightRate')) < 1.25 || Number(v('c_ot60Rate')) < 1.5) { err.textContent = '割増率が法律の下限（時間外・深夜25%、月60時間超50%）より低くなっています。'; return; }
        t.kyuyo = tb.kyuyo; t.brackets = tb.brackets;
        ['storeName', 'employer', 'minWagePref', 'minWageNote', 'empInsNote', 'adminPin'].forEach(k => { s[k] = v('c_' + k).trim(); });
        ['openHour', 'closeHour', 'step', 'need', 'otRate', 'ot60Rate', 'nightRate', 'weekStart', 'empInsRate', 'payDay', 'laborTarget', 'minWage', 'limitMonth', 'limitYear'].forEach(k => { s[k] = Number(v('c_' + k)); });
        s.agreement36 = card.querySelector('#c_agreement36').checked;
        ['zeroBelow', 'kiso', 'fuyo', 'otsuRate'].forEach(k => { t[k] = Number(v('t_' + k)); });
        t.version = '手動で更新（' + U.today() + '）';
        S.log('管理者', '設定を変更', '設定', '');
        S.save(); UI.toast('設定を保存しました'); Admin.refresh();
      };
      card.querySelector('#taxReset').onclick = () => { s.tax = App.defaultTax(); S.save(); UI.toast('税の数値を初期値に戻しました'); Admin.refresh(); };
      main.append(card);

      const data = UI.el(`<section class="card"><h2>データのバックアップ</h2>
        <p class="muted">試作版では、データはこの端末のブラウザの中に保存されています。下の文字をコピーして保存しておくと、あとで貼り付けて元に戻せます。中身には個人情報が含まれるので、保管場所に気をつけてください。</p>
        <textarea id="bk" rows="4" class="mono" readonly></textarea>
        <div class="row-end"><button class="btn" id="bkMake">今のデータを表示</button><button class="btn" id="bkCopy">コピー</button></div>
        <label class="field wide">復元するデータを貼り付け<textarea id="rs" rows="3" class="mono"></textarea></label>
        <div class="row-end"><button class="btn" id="rsDo">貼り付けたデータで置き換える</button><button class="btn danger" id="reset">見本データに作り直す</button></div></section>`);
      const bk = data.querySelector('#bk');
      data.querySelector('#bkMake').onclick = () => { bk.value = JSON.stringify(S.get()); };
      data.querySelector('#bkCopy').onclick = () => {
        if (!bk.value) bk.value = JSON.stringify(S.get());
        navigator.clipboard.writeText(bk.value).then(() => UI.toast('コピーしました'), () => { bk.select(); UI.toast('選択しました。Ctrl+C（スマホは長押し）でコピーしてください'); });
      };
      data.querySelector('#rsDo').onclick = async () => {
        let nd; try { nd = JSON.parse(data.querySelector('#rs').value); if (!nd.staff || !nd.settings) throw 0; } catch (e) { UI.toast('データの形が正しくありません'); return; }
        if (await UI.confirm('今のデータを、貼り付けたデータで置き換えます。', '置き換える', true)) { S.replace(nd); UI.toast('置き換えました'); Admin.refresh(); }
      };
      data.querySelector('#reset').onclick = async () => {
        if (await UI.confirm('今のデータをすべて消して、見本データを作り直します。', '作り直す', true)) { S.reset(); UI.toast('見本データを作り直しました'); Admin.refresh(); }
      };
      main.append(data);
    },
  });
})();
