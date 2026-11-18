/* シフト管理 MVP 共通処理（データはブラウザの localStorage に保存） */
const OPEN_HOUR = 9;     // 営業開始
const CLOSE_HOUR = 22;   // 営業終了
const STEP_MIN = 30;     // 入力・表示の刻み（分）
const STORE_KEY = 'shiftApp.v1';

const COLORS = ['#4f8cff','#ff7a59','#2bb673','#a66cff','#f5b700','#ff5fa2','#00b8d9','#8d6e63','#5c6bc0','#ef5350'];

function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d && Array.isArray(d.staff) && Array.isArray(d.shifts)) return d;
  } catch (e) {}
  return { staff: [], shifts: [] };
}
function saveData(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---- 時刻 ---- */
function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function toHHMM(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
function shortTime(hhmm) { const [h, m] = hhmm.split(':'); return m === '00' ? String(+h) : `${+h}:${m}`; }
function timeOptions() {
  const out = [];
  for (let t = OPEN_HOUR * 60; t <= CLOSE_HOUR * 60; t += STEP_MIN) out.push(toHHMM(t));
  return out;
}
function hoursOf(s) { return (toMin(s.end) - toMin(s.start)) / 60; }

/* ---- 日付 ---- */
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function mondayOf(s) { const d = parseYmd(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return ymd(d); }
const WD = ['日', '月', '火', '水', '木', '金', '土'];
function labelDate(s) { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; }
function wdClass(s) { const w = parseYmd(s).getDay(); return w === 0 ? 'sun' : w === 6 ? 'sat' : ''; }
function today() { return ymd(new Date()); }

/* ---- URLパラメータ ---- */
function param(name) { return new URLSearchParams(location.search).get(name); }

function staffById(d, id) { return d.staff.find(s => s.id === id); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---- 共通ナビ ---- */
function renderNav(active) {
  const items = [
    ['input.html', 'シフト入力'],
    ['day.html', '1日のシフト表'],
    ['week.html', '週間シフト'],
  ];
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `<div class="brand">シフト表</div>` + items.map(([h, t]) =>
    `<a href="${h}" class="${h === active ? 'on' : ''}">${t}</a>`).join('');
  document.body.prepend(nav);
}

/* ---- バックアップ（JSON書き出し・読み込み） ---- */
function exportJson() {
  const blob = new Blob([JSON.stringify(loadData(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shift-${today()}.json`;
  a.click();
}
function importJson(file, done) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.staff) || !Array.isArray(d.shifts)) throw new Error();
      if (confirm('現在のデータを読み込んだデータで置き換えます。よろしいですか？')) { saveData(d); done && done(); }
    } catch (e) { alert('ファイルの形式が正しくありません'); }
  };
  r.readAsText(file);
}
