/* ミセカン 従業員アプリ用の窓口（StaffAPI）
 * 従業員アプリ（staff.js）は App.Store を直接さわらず、必ずこの窓口だけを使います。
 * 窓口はログインした本人のデータだけを複製して返すので、他の人の時給・シフト・給与は画面に届きません。
 * 本番では、この窓口と同じ形の API をサーバー側に作り、ログイン情報で本人確認してから本人分だけを返します。
 */
'use strict';
(function () {
  const U = App.U;
  const copy = o => JSON.parse(JSON.stringify(o));

  App.StaffAPI = {
    /* 名前の一覧（ログイン画面用）：名前とIDだけを返す */
    loginList() { return App.Store.get().staff.filter(s => s.active).map(s => ({ id: s.id, name: s.name })); },

    login(staffId, pin) {
      const st = App.Store.staff(staffId);
      if (!st || !st.active || String(st.pin) !== String(pin)) return null;
      return session(staffId);
    },
  };

  function session(id) {
    const db = () => App.Store.get();
    const me = () => db().staff.find(s => s.id === id);
    return {
      store() { const s = db().settings; return { name: s.storeName, open: s.openHour, close: s.closeHour, step: s.step }; },
      profile() { const s = me(); return { id: s.id, name: s.name, wage: s.wage, transport: s.transport, color: s.color, code: s.code }; },

      myShifts(from, to) { return copy(db().shifts.filter(x => x.staffId === id && x.date >= from && x.date <= to)); },
      myRequests() { return copy(db().requests.filter(x => x.staffId === id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)); },
      submitRequest(date, start, end, note) {
        const d = db();
        if (U.toMin(end) <= U.toMin(start)) return '終了は開始より後にしてください';
        const clash = [...d.requests.filter(r => r.status !== 'rejected'), ...d.shifts]
          .some(r => r.staffId === id && r.date === date && U.toMin(start) < U.toMin(r.end) && U.toMin(r.start) < U.toMin(end));
        if (clash) return `${U.label(date)} は時間が重なる希望・シフトがあります`;
        d.requests.push({ id: U.uid(), staffId: id, date, start, end, note: note || '', status: 'pending', createdAt: new Date().toISOString() });
        App.Store.save(); return '';
      },
      cancelRequest(rid) {
        const d = db(); const r = d.requests.find(x => x.id === rid && x.staffId === id && x.status === 'pending');
        if (r) { d.requests = d.requests.filter(x => x !== r); App.Store.save(); }
      },

      todayPunch() { return copy(db().punches.find(p => p.staffId === id && p.date === U.today()) || null); },
      punch(type) {
        const d = db(), now = U.nowHHMM(), today = U.today();
        let p = d.punches.find(x => x.staffId === id && x.date === today);
        if (type === 'in') {
          if (p && p.in) return 'すでに出勤しています';
          p = { id: U.uid(), staffId: id, date: today, in: now, out: '', breakMin: 0, breakStart: '' };
          d.punches.push(p);
        } else {
          if (!p || !p.in) return 'まだ出勤していません';
          if (p.out) return 'すでに退勤しています';
          if (type === 'breakStart') { if (p.breakStart) return '休憩中です'; p.breakStart = now; }
          if (type === 'breakEnd') {
            if (!p.breakStart) return '休憩を始めていません';
            p.breakMin += Math.max(0, U.toMin(now) - U.toMin(p.breakStart)); p.breakStart = '';
          }
          if (type === 'out') {
            if (p.breakStart) { p.breakMin += Math.max(0, U.toMin(now) - U.toMin(p.breakStart)); p.breakStart = ''; }
            p.out = now;
          }
        }
        App.Store.save(); return '';
      },
      myPunches(ym) { return copy(db().punches.filter(p => p.staffId === id && p.date.startsWith(ym))).sort((a, b) => a.date.localeCompare(b.date)); },

      /* 確定した給与明細だけ */
      myPayslips() { return copy(db().payrolls.filter(p => p.staffId === id)).sort((a, b) => b.ym.localeCompare(a.ym)); },
      /* 今月の見込み（本人分だけ計算） */
      estimate(ym) { return App.Pay.month(me(), ym, db()); },

      posts() {
        const d = db();
        return d.posts.slice().sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt)).map(p => {
          const rs = d.reactions.filter(r => r.postId === p.id);
          const counts = {}; rs.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
          return {
            id: p.id, title: p.title, body: p.body, important: p.important, pinned: p.pinned, createdAt: p.createdAt,
            read: d.reads.some(r => r.postId === p.id && r.staffId === id),
            mine: rs.filter(r => r.staffId === id).map(r => r.emoji),
            counts, // 人数だけ。誰が押したかは本人には届けない
          };
        });
      },
      markRead(postId) {
        const d = db();
        if (!d.reads.some(r => r.postId === postId && r.staffId === id)) { d.reads.push({ postId, staffId: id, at: new Date().toISOString() }); App.Store.save(); }
      },
      react(postId, emoji) {
        const d = db();
        const i = d.reactions.findIndex(r => r.postId === postId && r.staffId === id && r.emoji === emoji);
        if (i >= 0) d.reactions.splice(i, 1); else d.reactions.push({ postId, staffId: id, emoji, at: new Date().toISOString() });
        this.markRead(postId); App.Store.save();
      },
    };
  }
})();
