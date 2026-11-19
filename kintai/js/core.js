/* ミセカン 共通処理：日付・時刻・金額・保存・画面部品 */
'use strict';
const App = window.App = {};

/* ---------- 小さな道具 ---------- */
const U = App.U = {
  pad: n => String(n).padStart(2, '0'),
  ymd: d => `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`,
  parse: s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); },
  addDays: (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.ymd(d); },
  monday: s => { const d = U.parse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return U.ymd(d); },
  today: () => U.ymd(new Date()),
  ym: s => s.slice(0, 7),
  ymAdd: (ym, n) => { const d = U.parse(ym + '-01'); d.setMonth(d.getMonth() + n); return U.ymd(d).slice(0, 7); },
  monthDays: ym => { const out = []; let d = ym + '-01'; while (d.startsWith(ym)) { out.push(d); d = U.addDays(d, 1); } return out; },
  WD: ['日', '月', '火', '水', '木', '金', '土'],
  wd: s => U.parse(s).getDay(),
  label: s => { const d = U.parse(s); return `${d.getMonth() + 1}/${d.getDate()}(${U.WD[d.getDay()]})`; },
  ymLabel: ym => `${ym.slice(0, 4)}年${+ym.slice(5, 7)}月`,
  /* その日時点の満年齢 */
  age: (birth, on) => { if (!birth) return null; const [y, m, d] = birth.split('-').map(Number); const [Y, M, D] = on.split('-').map(Number); return Y - y - ((M < m || (M === m && D < d)) ? 1 : 0); },
  wdClass: s => { const w = U.wd(s); return w === 0 ? 'sun' : w === 6 ? 'sat' : ''; },
  toMin: t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
  toHHMM: m => `${U.pad(Math.floor(m / 60))}:${U.pad(m % 60)}`,
  short: t => { const [h, m] = t.split(':'); return m === '00' ? String(+h) : `${+h}:${m}`; },
  nowHHMM: () => { const d = new Date(); return `${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`; },
  hm: min => `${Math.floor(min / 60)}:${U.pad(Math.round(min % 60))}`,
  yen: n => '¥' + Math.round(n).toLocaleString('ja-JP'),
  num: n => Math.round(n).toLocaleString('ja-JP'),
  wareki: y => y >= 2019 ? `令和${y - 2018 === 1 ? '元' : y - 2018}年` : `${y}年`,
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  sum: (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0),
  timeOptions(from, to, step) { const o = []; for (let t = from * 60; t <= to * 60; t += step) o.push(U.toHHMM(t)); return o; },
  options: (list, sel) => list.map(v => Array.isArray(v)
    ? `<option value="${U.esc(v[0])}"${v[0] === sel ? ' selected' : ''}>${U.esc(v[1])}</option>`
    : `<option${v === sel ? ' selected' : ''}>${U.esc(v)}</option>`).join(''),
  overlap: (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)),
};

/* ---------- 変更通知 ---------- */
App.bus = {
  fns: [],
  on(f) { this.fns.push(f); },
  emit(kind) { this.fns.forEach(f => { try { f(kind); } catch (e) { console.error(e); } }); },
};

/* ---------- 保存（試作版は端末のブラウザに保存） ---------- */
const KEY = 'misekan.v2';   // データの形を変えたので v2（v1 の見本データは使いません）
let mem = null;
App.Store = {
  get() {
    if (mem) return mem;
    try { const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw); } catch (e) { mem = null; }
    if (!mem || !mem.staff) { mem = App.Seed.create(); this.save(true); }
    ['auditLog', 'mailLog', 'reads', 'reactions', 'requests', 'payrolls', 'sales', 'purchases', 'posts'].forEach(k => { if (!Array.isArray(mem[k])) mem[k] = []; });
    if (!Array.isArray(mem.items)) {   // 古いデータには商品マスタがないので、販売記録から作る
      const m = new Map(); mem.purchases.forEach(p => { if (!m.has(p.item)) m.set(p.item, { id: 'it' + (m.size + 1), name: p.item, category: p.category, price: p.price }); });
      mem.items = [...m.values()];
    }
    return mem;
  },
  save(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 保存できない環境でも画面は動かす */ }
    if (!silent) App.bus.emit();
  },
  replace(d) { mem = d; this.save(); },
  reset() { mem = App.Seed.create(); this.save(); },
  staff(id) { return this.get().staff.find(s => s.id === id); },
  /* 変更の記録（労働時間の記録を後から直したとき、誰が・いつ・なぜ直したかを残す） */
  log(actor, action, target, detail, reason) {
    const d = this.get();
    d.auditLog.push({ at: new Date().toISOString().slice(0, 19), actor, action, target, detail: detail || '', reason: reason || '' });
  },
};
/* 管理者ページと従業員ページを同じ端末で開いているとき、片方の変更をもう片方に反映する */
addEventListener('storage', e => {
  if (e.key !== KEY) return;
  mem = null;
  App.bus.emit('external');
});
App.pref = {
  get(k, d) { try { const v = localStorage.getItem('misekan.pref.' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('misekan.pref.' + k, v); } catch (e) {} },
};

/* ---------- 画面部品 ---------- */
App.UI = {
  el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(this._tt); this._tt = setTimeout(() => { t.hidden = true; }, 2600);
  },
  /* ブラウザの confirm は使えない環境があるため、画面内で確認する */
  modal(title, bodyHtml, buttons) {
    const wrap = App.UI.el(`<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${U.esc(title)}</h3><button class="icon-btn" data-x aria-label="閉じる">×</button></div>
      <div class="modal-body">${bodyHtml}</div><div class="modal-foot"></div></div></div>`);
    const close = () => wrap.remove();
    const foot = wrap.querySelector('.modal-foot');
    (buttons || [{ label: '閉じる' }]).forEach(b => {
      const btn = App.UI.el(`<button class="btn ${b.kind || ''}">${U.esc(b.label)}</button>`);
      btn.onclick = () => { if (b.onClick && b.onClick(wrap) === false) return; close(); };
      foot.append(btn);
    });
    wrap.querySelector('[data-x]').onclick = close;
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    document.body.append(wrap);
    const f = wrap.querySelector('input,select,textarea'); if (f) f.focus();
    return { el: wrap, close };
  },
  confirm(msg, okLabel, danger) {
    return new Promise(res => App.UI.modal('確認', `<p>${U.esc(msg)}</p>`, [
      { label: 'やめる', onClick: () => res(false) },
      { label: okLabel || 'はい', kind: danger ? 'danger' : 'primary', onClick: () => res(true) },
    ]));
  },
  tip(e, html) {
    const t = document.getElementById('tooltip');
    if (!html) { t.hidden = true; return; }
    t.innerHTML = html; t.hidden = false;
    const r = t.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  },
  /* 期間切り替えバー */
  stepper(label, onPrev, onNext, extra) {
    const el = App.UI.el(`<div class="stepper"><button class="btn sm" aria-label="前へ">◀</button><b class="stepper-label">${label}</b><button class="btn sm" aria-label="次へ">▶</button>${extra || ''}</div>`);
    const [p, n] = el.querySelectorAll('button'); p.onclick = onPrev; n.onclick = onNext;
    return el;
  },
};

/* ---------- グラフ（縦棒・1系列） ---------- */
App.Chart = {
  bars(data, opt = {}) {
    const W = opt.width || 720, H = opt.height || 220, L = 56, R = 8, T = 12, B = 28;
    const max = Math.max(1, ...data.map(d => d.value));
    const step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    const cw = (W - L - R) / data.length, bw = Math.max(2, Math.min(36, cw * 0.62));
    const y = v => T + (H - T - B) * (1 - v / top);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${U.esc(opt.label || '')}">`;
    for (let v = 0; v <= top; v += step) {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid${v === 0 ? ' base' : ''}"/>`;
      s += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${opt.fmtAxis ? opt.fmtAxis(v) : U.num(v)}</text>`;
    }
    const every = Math.ceil(data.length / (opt.maxLabels || 16));
    data.forEach((d, i) => {
      const cx = L + cw * i + cw / 2, h = Math.max(0, y(0) - y(d.value));
      const r = Math.min(4, bw / 2, h);
      s += `<g class="bar-g${d.hl ? ' hl' : ''}" data-i="${i}"><rect x="${L + cw * i}" y="${T}" width="${cw}" height="${H - T - B}" class="hit"/>`;
      if (h > 0) s += `<path class="bar" d="M${cx - bw / 2},${y(0)} V${y(0) - h + r} Q${cx - bw / 2},${y(0) - h} ${cx - bw / 2 + r},${y(0) - h} H${cx + bw / 2 - r} Q${cx + bw / 2},${y(0) - h} ${cx + bw / 2},${y(0) - h + r} V${y(0)} Z"/>`;
      s += `</g>`;
      if (i % every === 0) s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="axis ${d.cls || ''}">${U.esc(d.label)}</text>`;
    });
    s += `</svg>`;
    const box = App.UI.el(`<div class="chart-box">${s}</div>`);
    box.querySelectorAll('.bar-g').forEach(g => {
      const d = data[+g.dataset.i];
      g.addEventListener('mousemove', e => App.UI.tip(e, `<b>${U.esc(d.tip || d.label)}</b><br>${opt.fmt ? opt.fmt(d.value) : U.num(d.value)}${d.sub ? '<br><span class="muted">' + U.esc(d.sub) + '</span>' : ''}`));
      g.addEventListener('mouseleave', e => App.UI.tip(e));
      if (opt.onClick) g.addEventListener('click', () => opt.onClick(d));
    });
    return box;
  },
  /* 横棒ランキング */
  ranking(rows, fmt) {
    const max = Math.max(1, ...rows.map(r => r.value));
    return App.UI.el(`<ol class="rank">${rows.map((r, i) => `<li>
      <span class="rank-no">${i + 1}</span>
      <span class="rank-name">${U.esc(r.label)}${r.sub ? `<small>${U.esc(r.sub)}</small>` : ''}</span>
      <span class="rank-bar"><i style="width:${(r.value / max * 100).toFixed(1)}%"></i></span>
      <span class="rank-val">${fmt ? fmt(r.value) : U.num(r.value)}</span></li>`).join('') || '<li class="muted">データがありません</li>'}</ol>`);
  },
};
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const n = x / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

/* ---------- 暗証番号の打ち間違いが続いたときの一時ロック（総当たり対策・試作版） ---------- */
App.Guard = {
  MAX: 5, LOCK_MIN: 5,
  read(k) { try { return JSON.parse(localStorage.getItem('misekan.guard.' + k)) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } },
  write(k, v) { try { localStorage.setItem('misekan.guard.' + k, JSON.stringify(v)); } catch (e) {} },
  /* ロック中なら残り分数、ロックされていなければ 0 */
  locked(k) { const g = this.read(k); return g.until > Date.now() ? Math.ceil((g.until - Date.now()) / 60000) : 0; },
  fail(k) { const g = this.read(k); g.n = (g.until && g.until < Date.now()) ? 1 : g.n + 1; g.until = g.n >= this.MAX ? Date.now() + this.LOCK_MIN * 60000 : 0; if (g.until) g.n = 0; this.write(k, g); return g.until ? this.LOCK_MIN : 0; },
  ok(k) { this.write(k, { n: 0, until: 0 }); },
};
/* ---------- 操作がないまま一定時間たったら閉じる ---------- */
App.idle = function (minutes, onIdle) {
  let t;
  const reset = () => { clearTimeout(t); t = setTimeout(onIdle, minutes * 60000); };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, reset, { passive: true }));
  reset();
};
