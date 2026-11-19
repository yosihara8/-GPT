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
      t.render(main);
    },
    refresh() { Admin.renderNav(); Admin.renderMain(); },
  };
  App.bus.on(() => { if (document.getElementById('adminView').hidden === false) Admin.renderNav(); });

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
        <div class="tile"><span class="tile-label">昨日の売上</span><b class="tile-num">${ySales ? U.yen(ySales.amount) : '未入力'}</b><span class="tile-sub">${ySales ? `客数 ${ySales.customers}人 ・ 客単価 ${U.yen(ySales.amount / Math.max(1, ySales.customers))}` : '売上タブから入力'}</span></div>
        <div class="tile"><span class="tile-label">今月の売上（${+ym.slice(5)}/1〜昨日）</span><b class="tile-num">${U.yen(salesM)}</b><span class="tile-sub"><span class="chip ${diff >= 0 ? 'good' : 'bad'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%</span> 前年同期比</span></div>
        <div class="tile"><span class="tile-label">今月の人件費（見込み）</span><b class="tile-num">${U.yen(labor)}</b><span class="tile-sub"><span class="chip ${ratio <= d.settings.laborTarget ? 'good' : 'warn'}">人件費率 ${ratio.toFixed(1)}%</span> 目標 ${d.settings.laborTarget}%</span></div>
        <div class="tile"><span class="tile-label">今日の出勤</span><b class="tile-num">${todayShifts.length}人<small> / 出勤中 ${working}人</small></b><span class="tile-sub">${pending ? `<a href="#shift" class="chip warn">シフト希望 ${pending}件が未承認</a>` : '未承認のシフト希望はありません'}</span></div>
      </section>`));

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
    id: 'board', label: '掲示板', group: '現場', lead: 'お知らせを書くと、従業員アプリに届きます。誰が読んだか・リアクションも確認できます。',
    badge() { const d = S.get(); const n = d.staff.filter(s => s.active); return d.posts.filter(p => p.important && n.some(s => !d.reads.some(r => r.postId === p.id && r.staffId === s.id))).length; },
    render(main) {
      const d = S.get();
      const form = UI.el(`<section class="card"><h2>お知らせを書く</h2>
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
          <div class="post-head"><h3>${p.pinned ? '<span class="chip">固定</span> ' : ''}${p.important ? '<span class="chip bad">重要</span> ' : ''}${U.esc(p.title)}</h3><span class="muted mono">${p.createdAt.slice(0, 16).replace('T', ' ')}</span></div>
          <p class="post-body">${U.esc(p.body)}</p>
          <div class="post-stats">
            <div><b>既読 ${readers.length}/${active.length}</b><span class="meter"><i style="width:${active.length ? readers.length / active.length * 100 : 0}%"></i></span></div>
            <div class="reacts">${Object.entries(byEmoji).map(([e, names]) => `<span class="react" title="${U.esc(names.join('、'))}">${U.esc(e)} ${names.length}<small>${U.esc(names.map(n => n.split(' ')[0]).join('・'))}</small></span>`).join('') || '<span class="muted">リアクションはまだありません</span>'}</div>
          </div>
          <details><summary>読んだ人・まだの人</summary><div class="who">
            <div><b>読んだ人</b> ${readers.map(s => `<span class="chip good">${U.esc(s.name)}</span>`).join('') || '<span class="muted">なし</span>'}</div>
            <div><b>まだの人</b> ${unread.map(s => `<span class="chip bad">${U.esc(s.name)}</span>`).join('') || '<span class="muted">全員読みました</span>'}</div></div></details>
          <div class="row-end"><button class="btn sm" data-pin>${p.pinned ? '固定をはずす' : '一番上に固定'}</button><button class="btn sm danger" data-del>削除</button></div>
        </article>`);
        card.querySelector('[data-pin]').onclick = () => { p.pinned = !p.pinned; S.save(); Admin.refresh(); };
        card.querySelector('[data-del]').onclick = async () => {
          if (!await UI.confirm(`「${p.title}」を削除します。既読とリアクションも消えます。`, '削除する', true)) return;
          d.posts = d.posts.filter(x => x !== p); d.reads = d.reads.filter(x => x.postId !== p.id); d.reactions = d.reactions.filter(x => x.postId !== p.id);
          S.save(); Admin.refresh();
        };
        main.append(card);
      });
    },
  });

  /* ================= 従業員名簿 ================= */
  const FIELDS = [
    ['code', '従業員番号', 'text'], ['name', '氏名', 'text'], ['kana', 'ふりがな', 'text'], ['role', '役割', 'text'],
    ['wage', '時給（円）', 'number'], ['transport', '交通費（1日・円）', 'number'], ['phone', '電話番号', 'tel'],
    ['birth', '生年月日', 'date'], ['hireDate', '入社日', 'date'], ['pin', 'アプリのPIN（4桁）', 'text'],
    ['dependents', '扶養人数', 'number'], ['socialIns', '社会保険料（月額・手入力）', 'number'],
  ];
  function staffForm(st, isNew) {
    const html = `<form class="form" id="stForm">${FIELDS.map(([k, l, t]) => `<label class="field">${l}<input id="f_${k}" type="${t}" value="${U.esc(st[k] ?? '')}" ${k === 'name' || k === 'wage' || k === 'pin' ? 'required' : ''}${t === 'number' ? ' min="0" step="1"' : ''}${k === 'pin' ? ' pattern="[0-9]{4}" inputmode="numeric"' : ''}></label>`).join('')}
      <label class="field">税額表の区分<select id="f_taxCol">${U.options([['甲', '甲欄（扶養控除等申告書あり）'], ['乙', '乙欄（掛け持ちの2か所目など）']], st.taxCol)}</select></label>
      <label class="field">色<input id="f_color" type="color" value="${st.color}"></label>
      <label class="check"><input type="checkbox" id="f_empIns" ${st.empIns ? 'checked' : ''}> 雇用保険に加入（週20時間以上）</label>
      <label class="check"><input type="checkbox" id="f_active" ${st.active ? 'checked' : ''}> 在籍中</label>
      <label class="field wide">メモ<textarea id="f_note" rows="2">${U.esc(st.note)}</textarea></label></form>`;
    UI.modal(isNew ? '従業員を追加' : `${st.name} さんの情報`, html, [
      { label: 'やめる' },
      { label: '保存する', kind: 'primary', onClick: w => {
        const f = w.querySelector('form'); if (!f.reportValidity()) return false;
        const v = id => w.querySelector('#f_' + id);
        FIELDS.forEach(([k, , t]) => { st[k] = t === 'number' ? Number(v(k).value || 0) : v(k).value.trim(); });
        st.taxCol = v('taxCol').value; st.color = v('color').value; st.empIns = v('empIns').checked; st.active = v('active').checked; st.note = v('note').value;
        const d = S.get(); if (isNew) d.staff.push(st);
        S.save(); UI.toast('保存しました'); Admin.refresh();
      } },
    ]);
  }
  Admin.register({
    id: 'staff', label: '従業員名簿', group: '人事・給与', lead: '時給・交通費・保険・税の区分はここで設定します。行を押すと編集できます。',
    render(main) {
      const d = S.get();
      const bar = UI.el(`<div class="toolbar"><button class="btn primary">＋ 従業員を追加</button><span class="muted">在籍 ${d.staff.filter(s => s.active).length}人</span></div>`);
      bar.querySelector('button').onclick = () => staffForm({ id: 'st' + U.uid(), code: 'S' + String(d.staff.length + 1).padStart(3, '0'), name: '', kana: '', role: 'アルバイト', wage: 1100, transport: 0, phone: '', birth: '', hireDate: U.today(), pin: String(1000 + Math.floor(Math.random() * 9000)), dependents: 0, socialIns: 0, taxCol: '甲', empIns: false, active: true, note: '', color: '#2f6fd6' }, true);
      main.append(bar);
      const card = UI.el(`<section class="card"><div class="scroll"><table class="tbl hover"><thead><tr><th>番号</th><th>氏名</th><th>役割</th><th class="r">時給</th><th class="r">交通費/日</th><th>雇用保険</th><th>税区分</th><th class="r">扶養</th><th>入社日</th><th>PIN</th><th>状態</th></tr></thead><tbody>${d.staff.map(s => `<tr data-id="${s.id}" tabindex="0">
        <td class="mono">${U.esc(s.code)}</td><td><i class="dot" style="background:${s.color}"></i><b>${U.esc(s.name)}</b><br><small class="muted">${U.esc(s.kana)}</small></td><td>${U.esc(s.role)}</td>
        <td class="r mono">${U.yen(s.wage)}</td><td class="r mono">${U.yen(s.transport)}</td><td>${s.empIns ? '<span class="chip good">加入</span>' : '<span class="chip">なし</span>'}</td><td>${s.taxCol}欄</td><td class="r">${s.dependents}人</td>
        <td class="mono">${U.esc(s.hireDate)}</td><td class="mono">${U.esc(s.pin)}</td><td>${s.active ? '<span class="chip good">在籍</span>' : '<span class="chip">退職</span>'}</td></tr>`).join('')}</tbody></table></div></section>`);
      card.querySelectorAll('tr[data-id]').forEach(tr => {
        const open = () => staffForm(S.staff(tr.dataset.id), false);
        tr.onclick = open; tr.onkeydown = e => { if (e.key === 'Enter') open(); };
      });
      main.append(card);
    },
  });

  /* ================= 設定 ================= */
  Admin.register({
    id: 'config', label: '設定・データ', group: 'その他', lead: '店舗の情報、割増率、保険料率、税額の計算に使う数値を変えられます。',
    render(main) {
      const d = S.get(), s = d.settings, t = s.tax;
      const card = UI.el(`<section class="card"><h2>店舗と計算の設定</h2><form class="form" id="cfg">
        <label class="field wide">店舗名<input id="c_storeName" value="${U.esc(s.storeName)}"></label>
        <label class="field">営業開始（時）<input id="c_openHour" type="number" min="0" max="23" value="${s.openHour}"></label>
        <label class="field">営業終了（時）<input id="c_closeHour" type="number" min="1" max="29" value="${s.closeHour}"></label>
        <label class="field">シフトの刻み（分）<select id="c_step">${U.options([['15', '15分'], ['30', '30分'], ['60', '60分']], String(s.step))}</select></label>
        <label class="field">必要人数（初期値）<input id="c_need" type="number" min="0" value="${s.need}"></label>
        <label class="field">残業の割増率<input id="c_otRate" type="number" step="0.01" min="1" value="${s.otRate}"></label>
        <label class="field">深夜（22〜5時）の割増率<input id="c_nightRate" type="number" step="0.01" min="1" value="${s.nightRate}"></label>
        <label class="field">雇用保険料率（本人負担）<input id="c_empInsRate" type="number" step="0.0001" min="0" value="${s.empInsRate}"></label>
        <label class="field">給料日（毎月）<input id="c_payDay" type="number" min="1" max="31" value="${s.payDay}"></label>
        <label class="field">人件費率の目標（%）<input id="c_laborTarget" type="number" min="0" max="100" value="${s.laborTarget}"></label>
        <h3 class="wide">源泉所得税（月額表・電算機計算の特例）</h3>
        <p class="wide notice">今の数値：${U.esc(t.version)}。税額表は改正されることがあります。本番で使う前に、国税庁の最新の「源泉徴収税額表」で必ず確認してください。</p>
        <label class="field">甲欄：この金額未満は0円<input id="t_zeroBelow" type="number" value="${t.zeroBelow}"></label>
        <label class="field">基礎控除（月額）<input id="t_kiso" type="number" value="${t.kiso}"></label>
        <label class="field">扶養1人あたりの控除（月額）<input id="t_fuyo" type="number" value="${t.fuyo}"></label>
        <label class="field">乙欄：一律の率<input id="t_otsuRate" type="number" step="0.00001" value="${t.otsuRate}"></label>
        <label class="field wide">給与所得控除・税率の表（JSON）<textarea id="t_tables" rows="5" class="mono">${U.esc(JSON.stringify({ kyuyo: t.kyuyo.map(r => [r[0] === Infinity || r[0] === null ? null : r[0], r[1], r[2]]), brackets: t.brackets.map(r => [r[0] === Infinity || r[0] === null ? null : r[0], r[1], r[2]]) }))}</textarea></label>
        <div class="wide row-end"><button type="button" class="btn" id="taxReset">税の数値を初期値に戻す</button><button class="btn primary">設定を保存</button></div>
      </form></section>`);
      card.querySelector('form').onsubmit = e => {
        e.preventDefault();
        const v = id => card.querySelector('#' + id).value;
        try {
          const tb = JSON.parse(v('t_tables')); const fix = a => a.map(r => [r[0] === null ? Infinity : r[0], r[1], r[2]]);
          t.kyuyo = fix(tb.kyuyo); t.brackets = fix(tb.brackets);
        } catch (err) { UI.toast('表の書き方が正しくありません。JSONの形を確認してください'); return; }
        s.storeName = v('c_storeName'); ['openHour', 'closeHour', 'step', 'need', 'otRate', 'nightRate', 'empInsRate', 'payDay', 'laborTarget'].forEach(k => { s[k] = Number(v('c_' + k)); });
        ['zeroBelow', 'kiso', 'fuyo', 'otsuRate'].forEach(k => { t[k] = Number(v('t_' + k)); });
        t.version = '手動で更新（' + U.today() + '）';
        S.save(); UI.toast('設定を保存しました'); Admin.refresh();
      };
      card.querySelector('#taxReset').onclick = () => { s.tax = App.defaultTax(); S.save(); UI.toast('税の数値を初期値に戻しました'); Admin.refresh(); };
      main.append(card);

      const data = UI.el(`<section class="card"><h2>データのバックアップ</h2>
        <p class="muted">試作版では、データはこの端末のブラウザの中に保存されています。下の文字をコピーして保存しておくと、あとで貼り付けて元に戻せます。</p>
        <textarea id="bk" rows="5" class="mono" readonly></textarea>
        <div class="row-end"><button class="btn" id="bkMake">今のデータを表示</button><button class="btn" id="bkCopy">コピー</button></div>
        <label class="field wide">復元するデータを貼り付け<textarea id="rs" rows="4" class="mono"></textarea></label>
        <div class="row-end"><button class="btn" id="rsDo">貼り付けたデータで置き換える</button><button class="btn danger" id="reset">見本データに作り直す</button></div></section>`);
      const bk = data.querySelector('#bk');
      data.querySelector('#bkMake').onclick = () => { bk.value = JSON.stringify(S.get()); };
      data.querySelector('#bkCopy').onclick = () => {
        if (!bk.value) bk.value = JSON.stringify(S.get());
        navigator.clipboard.writeText(bk.value).then(() => UI.toast('コピーしました'), () => { bk.select(); UI.toast('選択しました。長押しまたは Ctrl+C でコピーしてください'); });
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
