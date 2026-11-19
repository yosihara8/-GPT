/* ミセカン 管理画面：毎日の売上・購買履歴とランキング */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  const ss = { ym: U.ym(U.today()), days: '30', metric: 'amount', q: '' };
  const man = v => (v / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + '万';

  Admin.register({
    id: 'sales', label: '毎日の売上', group: '売上', lead: 'レジ締めの金額を毎日入力します。月ごとのグラフで前年と比べられます。',
    render(main) {
      const d = S.get(), ym = ss.ym, yest = U.addDays(U.today(), -1);
      const form = UI.el(`<section class="card"><h2>売上を入力</h2><form class="form inline-form">
        <label class="field">日付<input type="date" id="sDate" value="${yest}" required></label>
        <label class="field">売上（円）<input type="number" id="sAmt" min="0" step="1" required inputmode="numeric"></label>
        <label class="field">客数（人）<input type="number" id="sCus" min="0" step="1" inputmode="numeric"></label>
        <label class="field">メモ<input id="sNote" placeholder="例：雨・イベントあり"></label>
        <button class="btn primary">保存</button></form><p class="muted small" id="sHint"></p></section>`);
      const fill = () => { const r = d.sales.find(x => x.date === form.querySelector('#sDate').value); form.querySelector('#sAmt').value = r ? r.amount : ''; form.querySelector('#sCus').value = r ? r.customers : ''; form.querySelector('#sNote').value = r ? r.note : ''; form.querySelector('#sHint').textContent = r ? 'この日はすでに入力済みです。保存すると上書きします。' : ''; };
      form.querySelector('#sDate').onchange = fill; fill();
      form.querySelector('form').onsubmit = e => {
        e.preventDefault();
        const v = id => form.querySelector('#' + id).value, date = v('sDate');
        const rec = { date, amount: Number(v('sAmt')), customers: Number(v('sCus') || 0), note: v('sNote') };
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
      const ly = U.sum(d.sales.filter(x => x.date.startsWith(U.ymAdd(ym, -12))), x => x.amount);
      const diff = ly ? (total / ly - 1) * 100 : null;
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">月の売上</span><b class="tile-num">${U.yen(total)}</b><span class="tile-sub">${rec.length}日分入力</span></div>
        <div class="tile"><span class="tile-label">1日平均</span><b class="tile-num">${U.yen(rec.length ? total / rec.length : 0)}</b><span class="tile-sub">客数 ${U.num(cus)}人</span></div>
        <div class="tile"><span class="tile-label">客単価</span><b class="tile-num">${U.yen(cus ? total / cus : 0)}</b><span class="tile-sub">売上÷客数</span></div>
        <div class="tile"><span class="tile-label">前年同月</span><b class="tile-num">${ly ? U.yen(ly) : '−'}</b><span class="tile-sub">${diff === null ? 'データなし' : `<span class="chip ${diff >= 0 ? 'good' : 'bad'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%</span>`}</span></div></section>`));

      const c1 = UI.el(`<section class="card"><h2>日別の売上 <small class="muted">${U.ymLabel(ym)}</small></h2></section>`);
      c1.append(App.Chart.bars(days.map(x => { const r = rec.find(y => y.date === x); return { label: String(+x.slice(8)), cls: U.wdClass(x), tip: U.label(x), value: r ? r.amount : 0, sub: r ? `客数 ${r.customers}人${r.note ? ' ・ ' + r.note : ''}` : '未入力' }; }), { fmt: U.yen, fmtAxis: man, maxLabels: 31, label: '日別の売上' }));
      main.append(c1);

      const months = []; for (let i = 11; i >= 0; i--) months.push(U.ymAdd(ym, -i));
      const c2 = UI.el(`<section class="card"><h2>月別の売上 <small class="muted">棒を押すとその月を表示</small></h2></section>`);
      c2.append(App.Chart.bars(months.map(m => ({ m, label: `${+m.slice(5)}月`, tip: U.ymLabel(m), hl: m === ym, value: U.sum(d.sales.filter(x => x.date.startsWith(m)), x => x.amount) })), { fmt: U.yen, fmtAxis: man, label: '月別の売上', onClick: x => { ss.ym = x.m; Admin.refresh(); } }));
      main.append(c2);

      const tbl = UI.el(`<section class="card"><h2>入力の一覧</h2><div class="scroll"><table class="tbl hover"><thead><tr><th>日付</th><th class="r">売上</th><th class="r">客数</th><th class="r">客単価</th><th>メモ</th></tr></thead><tbody>${rec.slice().reverse().map(r => `<tr data-d="${r.date}" tabindex="0"><td class="${U.wdClass(r.date)}">${U.label(r.date)}</td><td class="r mono">${U.yen(r.amount)}</td><td class="r">${r.customers}</td><td class="r mono">${U.yen(r.customers ? r.amount / r.customers : 0)}</td><td>${U.esc(r.note)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">この月の売上はまだありません</td></tr>'}</tbody></table></div><p class="muted small">行を押すと上の入力欄に読み込みます。</p></section>`);
      tbl.querySelectorAll('tr[data-d]').forEach(tr => { tr.onclick = () => { form.querySelector('#sDate').value = tr.dataset.d; fill(); form.scrollIntoView({ behavior: 'smooth' }); }; });
      main.append(tbl);
    },
  });

  Admin.register({
    id: 'purchases', label: '購買履歴・ランキング', group: '売上', lead: '何がどれだけ売れたかを記録し、商品・カテゴリ・会員ごとのランキングを出します。',
    render(main) {
      const d = S.get(), today = U.today();
      const from = ss.days === 'all' ? '0000' : U.addDays(today, -Number(ss.days));
      const list = d.purchases.filter(p => p.date >= from);
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
      main.append(UI.el(`<section class="tiles">
        <div class="tile"><span class="tile-label">売れた数</span><b class="tile-num">${U.num(U.sum(list, p => p.qty))}個</b><span class="tile-sub">${list.length}件の記録</span></div>
        <div class="tile"><span class="tile-label">金額の合計</span><b class="tile-num">${U.yen(U.sum(list, p => p.qty * p.price))}</b><span class="tile-sub">${ss.days === 'all' ? 'すべての期間' : `直近${ss.days}日`}</span></div>
        <div class="tile"><span class="tile-label">会員の購入</span><b class="tile-num">${list.filter(p => p.customer).length}件</b><span class="tile-sub">全体の${list.length ? Math.round(list.filter(p => p.customer).length / list.length * 100) : 0}%</span></div></section>`));
      const grid = UI.el(`<div class="grid-2"></div>`);
      const c1 = UI.el(`<section class="card"><h2>商品ランキング</h2></section>`); c1.append(App.Chart.ranking(group(p => p.item, 10), fmt));
      const right = UI.el(`<div class="stack"></div>`);
      const c2 = UI.el(`<section class="card"><h2>カテゴリ別</h2></section>`); c2.append(App.Chart.ranking(group(p => p.category, 6), fmt));
      const c3 = UI.el(`<section class="card"><h2>会員ランキング</h2></section>`); c3.append(App.Chart.ranking(group(p => p.customer, 5), fmt));
      right.append(c2, c3); grid.append(c1, right); main.append(grid);

      const items = [...new Map(d.purchases.map(p => [p.item, p])).values()];
      const add = UI.el(`<section class="card"><h2>購買を記録</h2><form class="form inline-form">
        <label class="field">日付<input type="date" id="bDate" value="${today}" required></label>
        <label class="field">時刻<input type="time" id="bTime" value="${U.nowHHMM()}"></label>
        <label class="field">商品<input id="bItem" list="itemList" required placeholder="商品名"><datalist id="itemList">${items.map(p => `<option value="${U.esc(p.item)}">`).join('')}</datalist></label>
        <label class="field">カテゴリ<input id="bCat" list="catList" placeholder="例：ドリンク"><datalist id="catList">${[...new Set(items.map(p => p.category))].map(c => `<option value="${U.esc(c)}">`).join('')}</datalist></label>
        <label class="field">単価（円）<input type="number" id="bPrice" min="0" required></label>
        <label class="field">数量<input type="number" id="bQty" min="1" value="1" required></label>
        <label class="field">会員番号（任意）<input id="bCus" placeholder="例：会員0012"></label>
        <button class="btn primary">記録</button></form></section>`);
      add.querySelector('#bItem').onchange = e => { const p = items.find(x => x.item === e.target.value); if (p) { add.querySelector('#bCat').value = p.category; add.querySelector('#bPrice').value = p.price; } };
      add.querySelector('form').onsubmit = e => {
        e.preventDefault(); const v = id => add.querySelector('#' + id).value;
        d.purchases.push({ id: U.uid(), date: v('bDate'), time: v('bTime'), item: v('bItem').trim(), category: v('bCat').trim() || 'その他', price: Number(v('bPrice')), qty: Number(v('bQty')), customer: v('bCus').trim() });
        S.save(); UI.toast('記録しました'); Admin.refresh();
      };
      main.append(add);

      const q = ss.q.trim();
      const hist = list.filter(p => !q || (p.item + p.category + p.customer).includes(q)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      const h = UI.el(`<section class="card"><div class="card-head"><h2>購買履歴</h2><input type="search" id="bQ" placeholder="商品・カテゴリ・会員で絞り込み" value="${U.esc(ss.q)}" aria-label="絞り込み"></div><div class="scroll"><table class="tbl"><thead><tr><th>日時</th><th>商品</th><th>カテゴリ</th><th class="r">単価</th><th class="r">数量</th><th class="r">金額</th><th>会員</th></tr></thead><tbody>${hist.slice(0, 60).map(p => `<tr><td class="mono nowrap">${U.label(p.date)} ${p.time}</td><td>${U.esc(p.item)}</td><td><span class="chip">${U.esc(p.category)}</span></td><td class="r mono">${U.yen(p.price)}</td><td class="r">${p.qty}</td><td class="r mono">${U.yen(p.price * p.qty)}</td><td>${U.esc(p.customer) || '<span class="muted">−</span>'}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">該当する記録はありません</td></tr>'}</tbody></table></div><p class="muted small">${hist.length}件中、新しい順に${Math.min(60, hist.length)}件を表示</p></section>`);
      h.querySelector('#bQ').onchange = e => { ss.q = e.target.value; Admin.refresh(); };
      main.append(h);
    },
  });
})();
