/* ミセカン 見本データ（初回だけ作成。設定タブから作り直せます） */
'use strict';
App.Seed = {
  create() {
    const U = App.U;
    let seed = 20261118;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const today = U.today(), thisYm = U.ym(today);
    const COLORS = ['#2f6fd6', '#d9622b', '#1f9d6b', '#8a55d6', '#c99400', '#d6457f'];

    const staffDef = [
      ['S001', '佐藤 美咲', 'さとう みさき', 1150, 300, true, 0, 0, '甲', '1111', { 1: '09:00-14:00', 3: '09:00-14:00', 5: '09:00-14:00', 6: '09:00-17:00' }],
      ['S002', '鈴木 健太', 'すずき けんた', 1100, 400, true, 0, 0, '甲', '2222', { 1: '10:00-15:00', 2: '10:00-15:00', 4: '10:00-15:00', 5: '10:00-15:00', 0: '10:00-18:00' }],
      ['S003', '高橋 さくら', 'たかはし さくら', 1100, 0, false, 0, 0, '甲', '3333', { 2: '12:00-17:00', 3: '12:00-17:00', 5: '12:00-17:00', 6: '12:00-17:00' }],
      ['S004', '田中 翔', 'たなか しょう', 1250, 500, true, 0, 0, '甲', '4444', { 1: '14:00-22:00', 2: '14:00-22:00', 3: '14:00-22:00', 4: '14:00-22:00', 0: '13:00-22:00' }],
      ['S005', '伊藤 葵', 'いとう あおい', 1080, 200, false, 0, 0, '乙', '5555', { 3: '17:00-22:00', 4: '17:00-22:00', 5: '17:00-22:00', 6: '17:00-22:00' }],
      ['S006', '渡辺 大輔', 'わたなべ だいすけ', 1150, 300, true, 0, 1, '甲', '6666', { 1: '17:00-22:00', 2: '09:00-14:00', 4: '17:00-22:00', 6: '17:00-22:00', 0: '17:00-22:00' }],
    ];
    const staff = staffDef.map((d, i) => ({
      id: 'st' + (i + 1), code: d[0], name: d[1], kana: d[2], role: i === 3 ? 'バイトリーダー' : 'アルバイト',
      wage: d[3], transport: d[4], empIns: d[5], socialIns: d[6], dependents: d[7], taxCol: d[8], pin: d[9],
      color: COLORS[i], phone: `090-0000-${String(1001 + i)}`, hireDate: U.addDays(today, -ri(120, 900)),
      birth: `${ri(1985, 2006)}-${U.pad(ri(1, 12))}-${U.pad(ri(1, 28))}`, active: true, note: '', pattern: d[10],
    }));

    const shifts = [], punches = [], requests = [];
    const start = U.ymAdd(thisYm, -2) + '-01';
    const thisMon = U.monday(today), nextMon = U.addDays(thisMon, 7);
    const nowMin = U.toMin(U.nowHHMM());
    for (let d = start; d < nextMon; d = U.addDays(d, 1)) {
      for (const st of staff) {
        const pt = st.pattern[U.wd(d)]; if (!pt || rnd() < 0.06) continue;
        const [s, e] = pt.split('-');
        shifts.push({ id: U.uid() + ri(0, 999), staffId: st.id, date: d, start: s, end: e });
        if (d > today) continue;
        const inM = U.toMin(s) - ri(0, 12) + (rnd() < 0.08 ? ri(5, 15) : 0);
        let outM = U.toMin(e) + ri(0, 15) + (e === '22:00' && rnd() < 0.3 ? ri(10, 40) : 0);
        const len = outM - inM;
        const breakMin = len > 8 * 60 + 30 ? 60 : len > 6 * 60 ? 45 : 0;
        if (d === today) {
          if (nowMin < inM) continue;
          punches.push({ id: U.uid() + ri(0, 999), staffId: st.id, date: d, in: U.toHHMM(inM), out: nowMin >= outM ? U.toHHMM(outM) : '', breakMin: nowMin >= outM ? breakMin : 0, breakStart: '' });
        } else {
          punches.push({ id: U.uid() + ri(0, 999), staffId: st.id, date: d, in: U.toHHMM(inM), out: U.toHHMM(outM), breakMin, breakStart: '' });
        }
      }
    }
    // 来週分は「シフト希望（未承認）」として提出済みにしておく
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(nextMon, i);
      for (const st of staff) {
        const pt = st.pattern[U.wd(d)]; if (!pt || rnd() < 0.15) continue;
        const [s, e] = pt.split('-');
        requests.push({ id: U.uid() + ri(0, 999), staffId: st.id, date: d, start: s, end: e, note: '', status: 'pending', createdAt: new Date().toISOString() });
      }
    }
    requests.push({ id: U.uid() + 'x', staffId: 'st3', date: U.addDays(nextMon, 0), start: '12:00', end: '17:00', note: '月曜も入れます', status: 'pending', createdAt: new Date().toISOString() });

    // 売上（13か月分）
    const sales = [];
    const sStart = U.ymAdd(thisYm, -12) + '-01';
    for (let d = sStart; d < today; d = U.addDays(d, 1)) {
      const w = U.wd(d), m = +d.slice(5, 7);
      const wf = [1.25, 0.85, 0.85, 0.9, 0.95, 1.15, 1.35][w];
      const mf = [0.9, 0.85, 1.0, 1.05, 1.1, 0.95, 1.1, 1.15, 1.0, 1.0, 1.0, 1.2][m - 1];
      const amount = Math.round(215000 * wf * mf * (0.85 + rnd() * 0.3) / 10) * 10;
      sales.push({ date: d, amount, customers: Math.round(amount / ri(1350, 1650)), note: '' });
    }

    // 購買履歴（直近45日）
    const items = [
      ['ブレンドコーヒー', 'ドリンク', 450], ['カフェラテ', 'ドリンク', 520], ['アイスティー', 'ドリンク', 480],
      ['季節のフルーツティー', 'ドリンク', 650], ['クラブハウスサンド', 'フード', 980], ['ナポリタン', 'フード', 1050],
      ['日替わりランチ', 'フード', 1100], ['キーマカレー', 'フード', 1000], ['ガトーショコラ', 'デザート', 520],
      ['チーズケーキ', 'デザート', 500], ['プリン', 'デザート', 420], ['焼き菓子セット', 'テイクアウト', 1200], ['コーヒー豆 200g', 'テイクアウト', 1600]];
    const wts = [10, 9, 5, 4, 6, 5, 9, 6, 5, 6, 4, 2, 1];
    const members = ['会員0012', '会員0035', '会員0047', '会員0101', '会員0128', '会員0150', '会員0203'];
    const pick = () => { let r = rnd() * U.sum(wts); for (let i = 0; i < wts.length; i++) { r -= wts[i]; if (r < 0) return items[i]; } return items[0]; };
    const purchases = [];
    for (let d = U.addDays(today, -45); d < today; d = U.addDays(d, 1)) {
      const n = ri(16, 30);
      for (let k = 0; k < n; k++) {
        const it = pick();
        purchases.push({ id: U.uid() + k, date: d, time: U.toHHMM(ri(9 * 60, 21 * 60 + 30)), item: it[0], category: it[1], price: it[2], qty: rnd() < 0.15 ? 2 : 1, customer: rnd() < 0.25 ? members[ri(0, members.length - 1)] : '' });
      }
    }

    const iso = (d, t) => `${d}T${t}:00`;
    const posts = [
      { id: 'p1', title: '年末年始の営業時間について', body: '12/31は17時閉店、1/1〜1/3は休業です。\n12月後半のシフト希望は12/10までに提出してください。', important: true, pinned: true, createdAt: iso(U.addDays(today, -3), '10:00') },
      { id: 'p2', title: '新メニュー試食会', body: '来週の水曜15時から、冬の新メニューの試食会をします。参加できる人はリアクションで教えてください。', important: false, pinned: false, createdAt: iso(U.addDays(today, -1), '18:30') },
      { id: 'p3', title: '打刻忘れに気をつけてください', body: '退勤の打刻忘れが続いています。帰る前にアプリの「退勤」を押したか確認をお願いします。', important: false, pinned: false, createdAt: iso(U.addDays(today, -8), '09:15') },
    ];
    const reads = [], reactions = [];
    const rr = (p, s, emoji) => { reads.push({ postId: p, staffId: s, at: iso(today, '08:00') }); if (emoji) reactions.push({ postId: p, staffId: s, emoji, at: iso(today, '08:00') }); };
    rr('p1', 'st1', '了解'); rr('p1', 'st2', '了解'); rr('p1', 'st4', '👍'); rr('p1', 'st6');
    rr('p2', 'st1', '🙋'); rr('p2', 'st3', '🙋'); rr('p2', 'st4', '👍');
    ['st1', 'st2', 'st3', 'st4', 'st5', 'st6'].forEach(s => rr('p3', s, s === 'st5' ? '❤️' : '了解'));

    const data = {
      version: 1, demo: true,
      settings: { storeName: 'カフェ駅前店（見本）', openHour: 9, closeHour: 22, step: 30, need: 2, otRate: 1.25, nightRate: 1.25, empInsRate: 0.0055, payDay: 25, laborTarget: 30, tax: App.defaultTax() },
      staff, shifts, requests, punches, payrolls: [], sales, purchases, posts, reads, reactions,
    };
    staff.forEach(s => delete s.pattern);
    // 先々月・先月の給与は確定済みにしておく
    [U.ymAdd(thisYm, -2), U.ymAdd(thisYm, -1)].forEach(ym => staff.forEach(st => {
      const p = App.Pay.month(st, ym, data);
      if (p.days) data.payrolls.push(Object.assign(p, { id: U.uid() + st.id, confirmedAt: new Date().toISOString() }));
    }));
    return data;
  },
};
