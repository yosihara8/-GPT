/* ミセカン 見本データ（初回だけ作成。設定タブから作り直せます） */
'use strict';
App.Seed = {
  create() {
    const U = App.U;
    let seed = 20261118;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const today = U.today(), thisYm = U.ym(today);
    const COLORS = ['#c2185b', '#7b3f8c', '#2e8b7a', '#3f5ba9', '#b0803a', '#d0605e'];

    const staffDef = [
      ['S001', '佐藤 美咲', 'さとう みさき', 1250, 300, true, 0, 0, '甲', '1111', { 1: '09:00-14:00', 3: '09:00-14:00', 5: '09:00-14:00', 6: '09:00-17:00' }],
      ['S002', '鈴木 健太', 'すずき けんた', 1230, 400, true, 0, 0, '甲', '2222', { 1: '10:00-15:00', 2: '10:00-15:00', 4: '10:00-15:00', 5: '10:00-15:00', 0: '10:00-18:00' }],
      ['S003', '高橋 さくら', 'たかはし さくら', 1230, 0, false, 0, 0, '甲', '3333', { 2: '12:00-17:00', 3: '12:00-17:00', 5: '12:00-17:00', 6: '12:00-17:00' }],
      ['S004', '田中 翔', 'たなか しょう', 1350, 500, true, 0, 0, '甲', '4444', { 1: '14:00-22:00', 2: '14:00-22:00', 3: '14:00-22:00', 4: '14:00-22:00', 0: '13:00-22:00' }],
      ['S005', '伊藤 葵', 'いとう あおい', 1230, 200, false, 0, 0, '乙', '5555', { 3: '17:00-22:00', 4: '17:00-22:00', 5: '17:00-22:00', 6: '17:00-22:00' }],
      ['S006', '渡辺 大輔', 'わたなべ だいすけ', 1280, 300, true, 0, 1, '甲', '6666', { 1: '17:00-22:00', 2: '09:00-14:00', 4: '17:00-22:00', 6: '17:00-22:00', 0: '17:00-22:00' }],
    ];
    const staff = staffDef.map((d, i) => ({
      id: 'st' + (i + 1), code: d[0], name: d[1], kana: d[2], role: i === 3 ? 'バイトリーダー' : 'アルバイト',
      wage: d[3], transport: d[4], empIns: d[5], socialIns: d[6], dependents: d[7], taxCol: d[8], pin: d[9],
      color: COLORS[i], phone: `090-0000-${String(1001 + i)}`, hireDate: U.addDays(today, -ri(120, 900)),
      birth: `${ri(1985, 2005)}-${U.pad(ri(1, 12))}-${U.pad(ri(1, 28))}`, active: true, note: '', pattern: d[10],
      // 労働者名簿（労働基準法107条・施行規則53条）の項目
      gender: ['女性', '男性', '女性', '男性', '女性', '男性'][i], address: `東京都〇〇区〇〇町${i + 1}-${i + 2}（見本）`,
      history: '（見本）前職：飲食店ホール', job: i === 3 ? '接客・調理・締め作業' : '接客・調理補助',
      retireDate: '', retireReason: '', deathDate: '', deathCause: '',
      // メール配信（給与明細の電子交付には本人の承諾が必要：所得税法231条2項）
      email: `staff${i + 1}@example.com`, consent: i !== 2, consentDate: i !== 2 ? U.addDays(today, -ri(30, 200)) : '',
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
        // 34条：労働時間が6時間を超えたら45分、8時間を超えたら60分の休憩
        const breakMin = len - 45 > 8 * 60 ? 60 : len > 6 * 60 ? 45 : 0;
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

    // 商品マスタ
    const items = [
      ['ブレンドコーヒー', 'ドリンク', 450, 10], ['カフェラテ', 'ドリンク', 520, 9], ['アイスティー', 'ドリンク', 480, 5],
      ['季節のフルーツティー', 'ドリンク', 650, 4], ['クラブハウスサンド', 'フード', 980, 6], ['ナポリタン', 'フード', 1050, 5],
      ['日替わりランチ', 'フード', 1100, 9], ['キーマカレー', 'フード', 1000, 6], ['ガトーショコラ', 'デザート', 520, 5],
      ['チーズケーキ', 'デザート', 500, 6], ['プリン', 'デザート', 420, 4], ['焼き菓子セット', 'テイクアウト', 1200, 2], ['コーヒー豆 200g', 'テイクアウト', 1600, 1]]
      .map(([name, category, price, w], i) => ({ id: 'it' + (i + 1), name, category, price, w }));
    // 購買履歴（直近45日）：会員の購入（1件ずつ）＋ 商品ごとの1日分の集計。
    // この45日は「売上の合計＝明細の合計」になるように、売上の金額を明細から決める（矛盾をなくす）
    const members = ['会員0012', '会員0035', '会員0047', '会員0101', '会員0128', '会員0150', '会員0203'];
    const sumW = U.sum(items, x => x.w);
    const purchases = [];
    for (let d = U.addDays(today, -45); d < today; d = U.addDays(d, 1)) {
      const sale = sales.find(x => x.date === d); if (!sale) continue;
      let total = 0;
      for (let k = 0, n = ri(3, 8); k < n; k++) {
        const it = items[ri(0, items.length - 1)], qty = rnd() < 0.2 ? 2 : 1;
        purchases.push({ id: U.uid() + 'm' + k, date: d, time: U.toHHMM(ri(9 * 60, 21 * 60 + 30)), itemId: it.id, item: it.name, category: it.category, price: it.price, qty, customer: members[ri(0, members.length - 1)] });
        total += it.price * qty;
      }
      const rest = Math.max(0, sale.amount - total);
      items.forEach((it, k) => {
        const qty = Math.max(0, Math.round(rest * it.w / sumW / it.price * (0.8 + rnd() * 0.4)));
        if (!qty) return;
        purchases.push({ id: U.uid() + 'a' + k, date: d, time: '', itemId: it.id, item: it.name, category: it.category, price: it.price, qty, customer: '' });
        total += it.price * qty;
      });
      sale.amount = total;                                   // 明細の合計とそろえる
      sale.customers = Math.max(1, Math.round(total / ri(1350, 1650)));
    }
    items.forEach(x => delete x.w);

    const iso = (d, t) => `${d}T${t}:00`;
    const posts = [
      { id: 'p1', title: '年末年始の営業時間について', body: '12/31は17時閉店、1/1〜1/3は休業です。\n12月後半のシフト希望は12/10までに提出してください。', important: true, pinned: true, createdAt: iso(U.addDays(today, -3), '10:00') },
      { id: 'p2', title: '新メニュー試食会', body: '来週の水曜15時から、冬の新メニューの試食会をします。参加できる人はリアクションで教えてください。', important: false, pinned: false, createdAt: iso(U.addDays(today, -1), '18:30') },
      { id: 'p3', title: '打刻忘れに気をつけてください', body: '退勤の打刻忘れが続いています。帰る前に従業員ページの「退勤」を押したか確認をお願いします。', important: false, pinned: false, createdAt: iso(U.addDays(today, -8), '09:15') },
    ];
    const reads = [], reactions = [];
    const rr = (p, s, emoji) => { reads.push({ postId: p, staffId: s, at: iso(today, '08:00') }); if (emoji) reactions.push({ postId: p, staffId: s, emoji, at: iso(today, '08:00') }); };
    rr('p1', 'st1', '了解'); rr('p1', 'st2', '了解'); rr('p1', 'st4', '👍'); rr('p1', 'st6');
    rr('p2', 'st1', '🙋'); rr('p2', 'st3', '🙋'); rr('p2', 'st4', '👍');
    ['st1', 'st2', 'st3', 'st4', 'st5', 'st6'].forEach(s => rr('p3', s, s === 'st5' ? '❤️' : '了解'));

    const data = {
      version: 1, demo: true,
      settings: {
        storeName: 'カフェ駅前店（見本）', employer: '株式会社〇〇（見本）', openHour: 9, closeHour: 22, step: 30, need: 2,
        otRate: 1.25, ot60Rate: 1.5, nightRate: 1.25, weekStart: 0, payDay: 25, laborTarget: 30, adminPin: '0000',
        empInsRate: 0.0055, empInsNote: '令和7年度 一般の事業・労働者負担（令和8年4月以降は要確認）',
        minWage: 1226, minWagePref: '東京都', minWageNote: '令和7年10月改定の額（要確認：毎年10月ごろ改定）',
        agreement36: true, limitMonth: 45, limitYear: 360,
        tax: App.defaultTax(),
        mail: { enabled: false, timing: 'unset', day: 1, fromName: 'カフェ駅前店（見本）', subject: '【{店舗名}】{年月}分 給与明細・勤怠・シフトのお知らせ', payslip: true, attendance: true, shift: true },
      },
      staff, shifts, requests, punches, payrolls: [], sales, items, purchases, posts, reads, reactions, auditLog: [], mailLog: [],
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
