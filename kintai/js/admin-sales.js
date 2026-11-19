/* ミセカン 管理者ページ：毎日の売上・購買履歴とランキング
 * データの決まり：
 *  - 「売上」＝1日のレジ締めの合計と客数。管理者が「毎日の売上」で入力する（ホームやグラフはここから計算）
 *  - 「購買履歴」＝商品ごとの販売記録。管理者が「購買履歴・ランキング」で入力する（ランキングはここから計算）
 *  - 2つの合計が合わない日は「差」を表示し、明細の合計を売上に入れるボタンを出す
 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  const ss = { ym: U.ym(U.today()), days: '30', metric: 'amount', q: '', date: '' };
  const man = v => (v / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + '万';
  const detailSum = (d, date) => U.sum(d.purchases.filter(p => p.date === date), p => p.price * p.qty);
  const hasDetail = (d, date) => d.purchases.some(p => p.date === date);

  /* ================= 毎日の売上 ================= */
  Admin.register({
    id: 'sales', label: '毎日の売上', group: '売上', lead: '閉店後に、レジ締めの合計金額と客数をここに入力します。ホームの売上・グラフ・人件費率はこの数字から計算します。',
    render(main) {
      const d = S.get(), ym = ss.ym;
      if (!ss.date) ss.date = U.addDays(U.today(), -1);
      const form = UI.el(`<section class="card input-card" data-input><h2>売上を入力・修正</h2><form class="form inline-form">
        <label class="field">日付<input type="date" id="sDate" value="${ss.date}" max="${U.today()}" required></label>
        <label class="field">売上（円・税込み）<input type="number" id="sAmt" min="0" step="1" required inputmode="numeric"></label>
        <label class="field">客数（人）<input type="number" id="sCus" min="0" step="1" inputmode="numeric"></label>
        <label class="field">メモ<input id="sNote" placeholder="例：雨・イベントあり"></label>
        <button class="btn primary">保存</button></form>
        <div class="hint" id="sHint"></div></section>`);
      const fill = () => {
        const date = form.querySelector('#sDate').value; ss.date = date;
        const r = d.sales.find(x => x.date === date), ds = detailSum(d, date);
        form.querySelector('#sAmt').value = r ? r.amount : ''; form.querySelector('#sCus').value = r ? r.customers : ''; form.querySelector('#sNote').value = r ? r.note : '';
        const h = form.querySelector('#sHint');
        h.innerHTML = `${r ? '<span class="chip">入力済み：保存すると上書きします</span>' : '<span class="chip warn">まだ入力していない日です</span>'}
          ${hasDetail(d, date) ? ` <span>この日の購買履歴（商品明細）の合計：<b>${U.yen(ds)}</b></span> <button type="button" class="btn sm" id="useDetail">この金額を売上に入れる</button>` : ' <span class="muted">この日の商品明細はまだありません（「購買履歴・ランキング」で入力）</span>'}`;
        const u = h.querySelector('#useDetail'); if (u) u.onclick = () => { form.querySelector('#sAmt').value = ds; form.querySelector('#sAmt').focus(); };
      };
      form.querySelector('#sDate').onchange = fill; fill();
      form.querySelector('form').onsubmit = e => {
        e.preventDefault();
        const v = id => form.querySelector('#' + id).value, date = v('sDate');
        const rec = { date, amount: Number(v('sAmt')), customers: Number(v('sCus') || 0), note: v('sNote').trim() };
        const i = d.sales.findIndex(x => x.date === date); if (i >= 0) d.sales[i] = rec; else d.sales.push(rec);
        d.sales.sort((a, b) => a.date.localeCompare(b.date)); ss.ym = U.ym(date);
        S.save(); UI.toast(`${U.label(date)}の売上を保存しました`); Admin.refresh();
      };
      main.append(form);

      const bar = UI.el(`<div class="toolbar"></div>`);
      bar.append(UI.stepper(U.ymLabel(ym), () => { ss.ym = U.ymAdd(ym, -1); Admin.refresh(); }, () => { ss.ym = U.ymAdd(ym, 1); Admin.refresh(); }));
      main.append(bar);

      const days = U.monthDays(ym), rec = d.sales.filter(x => x.date.startsWith(ym));
      const total = U.sum(rec, x => x.amount), cus = U.sum(rec, x => x.customers);
      // 前年同月は「同じ日まで」で比べる（今月の途中なのに前年の1か月分と比べると、減ったように見えてしまうため）
      const lastDay = ym === U.ym(U.today()) ? +U.addDays(U.today(), -1).slice(8) : 31;
      const ly = U.sum(d.sales.filter(x => x.date.startsWith(U.ymAdd(ym, -12)) && +x.date.slice(8) <= lastDay), x => x.amount);
      const diff = ly ? (total / ly - 1) * 100 : null;
      const missing = days.filter(x => x < U.today() && !rec.some(r => r.date === x));
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">月の売上</span><b class="tile-num">${U.yen(total)}</b><span class="tile-sub">${rec.length}日分入力 ${missing.length ? `<span class="chip warn">未入力 ${missing.length}日</span>` : ''}</span></div>
        <div class="tile"><span class="tile-label">1日平均</span><b class="tile-num">${U.yen(rec.length ? total / rec.length : 0)}</b><span class="tile-sub">客数 ${U.num(cus)}人</span></div>
        <div class="tile"><span class="tile-label">客単価</span><b class="tile-num">${U.yen(cus ? total / cus : 0)}</b><span class="tile-sub">売上÷客数</span></div>
        <div class="tile"><span class="tile-label">前年同月${lastDay < 31 ? `（1〜${lastDay}日）` : ''}</span><b class="tile-num">${ly ? U.yen(ly) : '−'}</b><span class="tile-sub">${diff === null ? 'データなし' : `<span class="chip ${diff >= 0 ? 'good' : 'bad'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%</span>`}</span></div></section>`));

      const c1 = UI.el(`<section class="card"><h2>日別の売上 <small class="muted">${U.ymLabel(ym)}・棒を押すとその日を入力欄に読み込みます</small></h2></section>`);
      c1.append(App.Chart.bars(days.map(x => { const r = rec.find(y => y.date === x); return { date: x, label: String(+x.slice(8)), cls: U.wdClass(x), tip: U.label(x), value: r ? r.amount : 0, sub: r ? `客数 ${r.customers}人${r.note ? ' ・ ' + r.note : ''}` : '未入力' }; }),
        { fmt: U.yen, fmtAxis: man, maxLabels: 31, label: '日別の売上', onClick: x => { ss.date = x.date; Admin.refresh(); } }));
      main.append(c1);

      const months = []; for (let i = 11; i >= 0; i--) months.push(U.ymAdd(ym, -i));
      const c2 = UI.el(`<section class="card"><h2>月別の売上 <small class="muted">棒を押すとその月を表示</small></h2></section>`);
      c2.append(App.Chart.bars(months.map(m => ({ m, label: `${+m.slice(5)}月`, tip: U.ymLabel(m), hl: m === ym, value: U.sum(d.sales.filter(x => x.date.startsWith(m)), x => x.amount) })), { fmt: U.yen, fmtAxis: man, label: '月別の売上', onClick: x => { ss.ym = x.m; Admin.refresh(); } }));
      main.append(c2);

      const tbl = UI.el(`<section class="card"><h2>入力の一覧 <small class="muted">${U.ymLabel(ym)}</small></h2><div class="scroll"><table class="tbl"><thead><tr><th>日付</th><th class="r">売上</th><th class="r">客数</th><th class="r">客単価</th><th class="r">商品明細の合計</th><th class="r">差</th><th>メモ</th><th></th></tr></thead><tbody>${days.filter(x => x <= U.today()).reverse().map(x => {
        const r = rec.find(y => y.date === x), ds = hasDetail(d, x) ? detailSum(d, x) : null;
        if (!r) return `<tr class="missing"><td class="${U.wdClass(x)}">${U.label(x)}</td><td colspan="6"><span class="chip warn">未入力</span></td><td><button class="btn sm primary" data-edit="${x}">入力</button></td></tr>`;
        const gap = ds === null ? null : r.amount - ds;
        return `<tr><td class="${U.wdClass(x)}">${U.label(x)}</td><td class="r num">${U.yen(r.amount)}</td><td class="r">${r.customers}</td><td class="r num">${U.yen(r.customers ? r.amount / r.customers : 0)}</td>
          <td class="r num">${ds === null ? '<span class="muted">明細なし</span>' : U.yen(ds)}</td><td class="r num">${gap === null ? '−' : gap === 0 ? '<span class="chip good">一致</span>' : `<span class="chip warn">${gap > 0 ? '+' : ''}${U.num(gap)}</span>`}</td>
          <td>${U.esc(r.note)}</td><td class="nowrap"><button class="btn sm" data-edit="${x}">修正</button> <button class="btn sm danger" data-del="${x}">削除</button></td></tr>`;
      }).join('')}</tbody></table></div><p class="muted small">「差」は売上（レジ締め）と商品明細の合計の差です。明細を入力していない商品があると差が出ます。</p></section>`);
      tbl.onclick = async e => {
        const t = e.target;
        if (t.dataset.edit) { ss.date = t.dataset.edit; Admin.refresh(); setTimeout(() => { const f = document.querySelector('[data-input]'); f && f.scrollIntoView({ behavior: 'smooth' }); document.getElementById('sAmt')?.focus({ preventScroll: true }); }, 50); }
        if (t.dataset.del) {
          if (!await UI.confirm(`${U.label(t.dataset.del)}の売上を削除します。`, '削除する', true)) return;
          d.sales = d.sales.filter(x => x.date !== t.dataset.del); S.log('管理者', '売上を削除', U.label(t.dataset.del), ''); S.save(); UI.toast('削除しました'); Admin.refresh();
        }
      };
      main.append(tbl);
    },
  });

  /* ================= 購買履歴・ランキング ================= */
  function itemModal(it) {
    const d = S.get(), isNew = !it.id;
    UI.modal(isNew ? '商品を追加' : '商品を変更', `<form class="form">
      <label class="field wide">商品名<input id="i_name" value="${U.esc(it.name || '')}" required></label>
      <label class="field">カテゴリ<input id="i_cat" value="${U.esc(it.category || '')}" list="catList2" required><datalist id="catList2">${[...new Set(d.items.map(x => x.category))].map(c => `<option value="${U.esc(c)}">`).join('')}</datalist></label>
      <label class="field">単価（円・税込み）<input id="i_price" type="number" min="0" value="${it.price ?? ''}" required></label>
      <p class="wide muted small">単価を変えても、すでに記録した販売の金額は変わりません（記録したときの単価のまま残ります）。</p><p class="wide err" id="i_err"></p></form>`,
    [...(isNew ? [] : [{ label: '削除', kind: 'danger', onClick: () => { d.items = d.items.filter(x => x.id !== it.id); S.save(); UI.toast('商品マスタから削除しました（過去の記録は残ります）'); Admin.refresh(); } }]),
      { label: 'やめる' },
      { label: '保存する', kind: 'primary', onClick: w => {
        const f = w.querySelector('form'); if (!f.reportValidity()) return false;
        const name = w.querySelector('#i_name').value.trim();
        if (d.items.some(x => x.name === name && x.id !== it.id)) { w.querySelector('#i_err').textContent = '同じ名前の商品があります。'; return false; }
        const n = { name, category: w.querySelector('#i_cat').value.trim(), price: Number(w.querySelector('#i_price').value) };
        if (isNew) d.items.push(Object.assign({ id: 'it' + U.uid() }, n)); else Object.assign(it, n);
        S.save(); UI.toast('商品マスタを保存しました'); Admin.refresh();
      } }]);
  }

  Admin.register({
    id: 'purchases', label: '購買履歴・ランキング', group: '売上', lead: '商品ごとに「何がいくつ売れたか」を記録し、ランキングを出します。1日の売上の合計は「毎日の売上」で入力します。',
    render(main) {
      const d = S.get(), today = U.today();
      const from = ss.days === 'all' ? '0000' : U.addDays(today, -Number(ss.days));
      const list = d.purchases.filter(p => p.date >= from);

      // 入力欄（いちばん上）
      const add = UI.el(`<section class="card input-card" data-input><h2>販売を記録する</h2><form class="form inline-form">
        <label class="field">日付<input type="date" id="bDate" value="${today}" max="${today}" required></label>
        <label class="field">時刻（1日分の集計なら空欄）<input type="time" id="bTime"></label>
        <label class="field">商品（商品マスタから選ぶ）<select id="bItem" required><option value="">選んでください</option>${d.items.map(x => `<option value="${x.id}">${U.esc(x.name)}（${U.yen(x.price)}）</option>`).join('')}</select></label>
        <label class="field">数量<input type="number" id="bQty" min="1" value="1" required></label>
        <label class="field">会員番号（任意）<input id="bCus" placeholder="例：会員0012"></label>
        <button class="btn primary">記録</button></form>
        <p class="muted small">商品マスタにない商品は、下の「商品マスタ」で先に追加してください。記録した金額は「毎日の売上」の「商品明細の合計」に反映されます。</p></section>`);
      add.querySelector('form').onsubmit = e => {
        e.preventDefault(); const v = id => add.querySelector('#' + id).value;
        const it = d.items.find(x => x.id === v('bItem')); if (!it) return;
        d.purchases.push({ id: U.uid(), date: v('bDate'), time: v('bTime'), itemId: it.id, item: it.name, category: it.category, price: it.price, qty: Number(v('bQty')), customer: v('bCus').trim() });
        S.save(); UI.toast(`${it.name}×${v('bQty')} を記録しました`); Admin.refresh();
      };
      main.append(add);

      const bar = UI.el(`<div class="toolbar"><div class="seg">${[['7', '7日'], ['30', '30日'], ['90', '90日'], ['all', 'すべて']].map(([v, l]) => `<button data-days="${v}" aria-selected="${ss.days === v}">${l}</button>`).join('')}</div>
        <div class="seg">${[['amount', '金額'], ['qty', '数量']].map(([v, l]) => `<button data-m="${v}" aria-selected="${ss.metric === v}">${l}で並べる</button>`).join('')}</div></div>`);
      bar.querySelectorAll('[data-days]').forEach(b => { b.onclick = () => { ss.days = b.dataset.days; Admin.refresh(); }; });
      bar.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { ss.metric = b.dataset.m; Admin.refresh(); }; });
      main.append(bar);

      const val = p => ss.metric === 'qty' ? p.qty : p.qty * p.price;
      const fmt = ss.metric === 'qty' ? (v => U.num(v) + '個') : U.yen;
      const group = (key, n) => {
        const m = {}; list.forEach(p => { const k = key(p); if (!k) return; m[k] = m[k] || { label: k, value: 0, qty: 0, amt: 0 }; m[k].value += val(p); m[k].qty += p.qty; m[k].amt += p.qty * p.price; });
        return Object.values(m).sort((a, b) => b.value - a.value).slice(0, n).map(r => Object.assign(r, { sub: ss.metric === 'qty' ? U.yen(r.amt) : r.qty + '個' }));
      };
      const salesSum = U.sum(d.sales.filter(x => x.date >= from), x => x.amount);
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">売れた数</span><b class="tile-num">${U.num(U.sum(list, p => p.qty))}個</b><span class="tile-sub">${list.length}件の記録</span></div>
        <div class="tile"><span class="tile-label">明細の金額の合計</span><b class="tile-num">${U.yen(U.sum(list, p => p.qty * p.price))}</b><span class="tile-sub">同じ期間の売上（レジ締め）${U.yen(salesSum)}</span></div>
        <div class="tile"><span class="tile-label">会員の購入</span><b class="tile-num">${list.filter(p => p.customer).length}件</b><span class="tile-sub">${ss.days === 'all' ? 'すべての期間' : `直近${ss.days}日`}</span></div></section>`));
      const grid = UI.el(`<div class="grid-2"></div>`);
      const c1 = UI.el(`<section class="card"><h2>商品ランキング</h2></section>`); c1.append(App.Chart.ranking(group(p => p.item, 10), fmt));
      const right = UI.el(`<div class="stack"></div>`);
      const c2 = UI.el(`<section class="card"><h2>カテゴリ別</h2></section>`); c2.append(App.Chart.ranking(group(p => p.category, 6), fmt));
      const c3 = UI.el(`<section class="card"><h2>会員ランキング</h2></section>`); c3.append(App.Chart.ranking(group(p => p.customer, 5), fmt));
      right.append(c2, c3); grid.append(c1, right); main.append(grid);

      // 商品マスタ
      const master = UI.el(`<section class="card"><div class="card-head"><h2>商品マスタ</h2><button class="btn sm primary" id="itAdd">＋ 商品を追加</button></div><div class="scroll"><table class="tbl hover"><thead><tr><th>商品名</th><th>カテゴリ</th><th class="r">単価</th><th class="r">記録の件数</th></tr></thead><tbody>${d.items.map(x => `<tr data-it="${x.id}" tabindex="0"><td>${U.esc(x.name)}</td><td><span class="chip">${U.esc(x.category)}</span></td><td class="r num">${U.yen(x.price)}</td><td class="r">${d.purchases.filter(p => p.itemId === x.id).length}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">商品がありません</td></tr>'}</tbody></table></div><p class="muted small">行を押すと変更・削除できます。</p></section>`);
      master.querySelector('#itAdd').onclick = () => itemModal({});
      master.querySelectorAll('tr[data-it]').forEach(tr => { const o = () => itemModal(d.items.find(x => x.id === tr.dataset.it)); tr.onclick = o; tr.onkeydown = e => { if (e.key === 'Enter') o(); }; });
      main.append(master);

      const q = ss.q.trim();
      const hist = list.filter(p => !q || (p.item + p.category + p.customer).includes(q)).sort((a, b) => (b.date + (b.time || '99')).localeCompare(a.date + (a.time || '99')));
      const h = UI.el(`<section class="card"><div class="card-head"><h2>購買履歴</h2><input type="search" id="bQ" placeholder="商品・カテゴリ・会員で絞り込み" value="${U.esc(ss.q)}" aria-label="絞り込み"></div><div class="scroll"><table class="tbl"><thead><tr><th>日付</th><th>時刻</th><th>商品</th><th>カテゴリ</th><th class="r">単価</th><th class="r">数量</th><th class="r">金額</th><th>会員</th><th></th></tr></thead><tbody>${hist.slice(0, 80).map(p => `<tr><td class="nowrap ${U.wdClass(p.date)}">${U.label(p.date)}</td><td class="num">${p.time || '<span class="muted small">1日分の集計</span>'}</td><td>${U.esc(p.item)}</td><td><span class="chip">${U.esc(p.category)}</span></td><td class="r num">${U.yen(p.price)}</td><td class="r">${p.qty}</td><td class="r num">${U.yen(p.price * p.qty)}</td><td>${U.esc(p.customer) || '<span class="muted">−</span>'}</td><td><button class="btn sm danger" data-del="${p.id}">削除</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">該当する記録はありません</td></tr>'}</tbody></table></div><p class="muted small">${hist.length}件中、新しい順に${Math.min(80, hist.length)}件を表示</p></section>`);
      h.querySelector('#bQ').onchange = e => { ss.q = e.target.value; Admin.refresh(); };
      h.onclick = async e => {
        const id = e.target.dataset.del; if (!id) return;
        const p = d.purchases.find(x => x.id === id);
        if (!await UI.confirm(`${U.label(p.date)} ${p.item}×${p.qty} の記録を削除します。`, '削除する', true)) return;
        d.purchases = d.purchases.filter(x => x.id !== id); S.save(); UI.toast('削除しました'); Admin.refresh();
      };
      main.append(h);
    },
  });
})();
