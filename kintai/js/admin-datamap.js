/* ミセカン 管理者ページ：データの入力と流れ
 * すべてのデータについて「誰が・どこで入力し・どの画面で使われるか」を1枚にまとめます。
 */
'use strict';
(function () {
  const U = App.U, UI = App.UI, S = App.Store, Admin = App.Admin;
  Admin.register({
    id: 'datamap', label: 'データの入力と流れ', group: 'ホーム',
    lead: '画面に出ている数字は、すべてこの表のどこかで入力したデータから計算しています。入力する場所がわからないときは、ここから開いてください。',
    render(main) {
      const d = S.get(), today = U.today();
      const last = (arr, f) => arr.length ? arr.map(f).sort().pop() : '';
      const days = d.sales.length, pDays = new Set(d.purchases.map(p => p.date)).size;
      const rows = [
        ['売上（1日のレジ締めの合計・客数）', '管理者', 'sales', '毎日の売上', 'ホーム、毎日の売上のグラフ、人件費率', `${days}日分`, last(d.sales, x => x.date)],
        ['商品ごとの販売記録（購買履歴）', '管理者', 'purchases', '購買履歴・ランキング', '商品・カテゴリ・会員ランキング、売上との差の確認', `${d.purchases.length}件（${pDays}日分）`, last(d.purchases, x => x.date)],
        ['商品マスタ（商品名・カテゴリ・単価）', '管理者', 'purchases', '購買履歴・ランキング（商品マスタ）', '販売記録の入力欄', `${d.items.length}品`, ''],
        ['従業員（労働者名簿・時給・保険・税・連絡先・暗証番号）', '管理者', 'staff', '従業員名簿', '給与計算、シフト、法令チェック、メール、従業員ページのログイン', `${d.staff.length}人`, ''],
        ['シフト希望', '従業員', 'staffpage', '従業員ページ「シフト」→「希望を出す」', 'シフト（✓で承認・✕で却下）', `未承認 ${d.requests.filter(r => r.status === 'pending').length}件`, last(d.requests, x => x.createdAt.slice(0, 10))],
        ['シフト（確定）', '管理者', 'shift', 'シフト', '1日の階段表、従業員ページ「シフト」、人件費（予定）、メール', `${d.shifts.filter(x => x.date >= today).length}件（今日以降）`, ''],
        ['打刻（出勤・休憩・退勤）', '従業員（直すのは管理者）', 'attendance', '従業員ページ「打刻」／勤怠・打刻（手入力・修正）', '勤怠の集計、給与計算、法令チェック、ホームの出勤状況', `${d.punches.length}件`, last(d.punches, x => x.date)],
        ['給与（確定）', '管理者', 'payroll', '給与計算で「確定」', '給与明細、賃金台帳、源泉徴収、従業員ページ「給与明細」、メール', `${d.payrolls.length}件`, last(d.payrolls, x => x.ym)],
        ['お知らせ', '管理者', 'board', '掲示板', '従業員ページ「掲示板」', `${d.posts.length}件`, last(d.posts, x => x.createdAt.slice(0, 10))],
        ['既読・リアクション', '従業員', 'staffpage', '従業員ページ「掲示板」', '掲示板（読んだ人・まだの人・押した人）', `既読 ${d.reads.length}件・リアクション ${d.reactions.length}件`, ''],
        ['設定（最低賃金・割増率・36協定・保険料率・税・暗証番号）', '管理者', 'config', '設定・データ', '給与計算、法令チェック、ログイン', '−', ''],
        ['メール配信の設定', '管理者', 'mail', 'メール配信', '月1回のメール（試作では送信しない）', `記録 ${d.mailLog.length}件`, ''],
        ['修正の記録', '自動で残る', 'attendance', '勤怠・打刻（下の「修正の記録」）', '労働時間の記録の確認', `${d.auditLog.length}件`, last(d.auditLog, x => x.at.slice(0, 10))],
      ];
      main.append(UI.el(`<section class="card"><div class="scroll"><table class="tbl datamap"><thead><tr><th>データ</th><th>入力する人</th><th>入力する場所</th><th>使われる画面</th><th class="r">件数</th><th>最新</th><th></th></tr></thead><tbody>${rows.map(([what, who, tab, where, used, n, lastDate]) => `<tr>
        <td><b>${what}</b></td><td class="nowrap"><span class="chip ${who.startsWith('従業員') ? 'info' : who === '管理者' ? 'good' : ''}">${who}</span></td><td>${where}</td><td class="small">${used}</td><td class="r nowrap">${n}</td><td class="nowrap small">${lastDate ? U.esc(lastDate) : '−'}</td>
        <td>${tab === 'staffpage' ? '<a class="btn sm" href="staff.html">従業員ページ</a>' : `<a class="btn sm primary" href="#${tab}">${who === '管理者' ? '入力する' : '開く'}</a>`}</td></tr>`).join('')}</tbody></table></div></section>`));
      main.append(UI.el(`<section class="card"><h2>データの流れ</h2><ol class="flow">
        <li><b>毎日</b>：従業員が従業員ページで<b>打刻</b>する → 管理者は「勤怠・打刻」で確認し、打刻もれを理由つきで直す。閉店後に管理者が「毎日の売上」に<b>レジ締めの合計</b>を入力し、「購買履歴」に<b>商品ごとの販売数</b>を入力する。</li>
        <li><b>週ごと</b>：従業員が従業員ページで<b>シフト希望</b>を出す → 管理者が「シフト」で承認・調整して<b>シフトを確定</b> → 従業員ページに表示される。</li>
        <li><b>月末</b>：締め日を過ぎたら、管理者が「給与計算」で内容を確かめて<b>確定</b> → 給与明細・賃金台帳・源泉徴収に反映 → 従業員ページの「給与明細」に表示される（メールは送信日を決めたあとに対応）。</li>
        <li><b>いつでも</b>：管理者が「掲示板」でお知らせを書く → 従業員が読む・リアクションする → 管理者は誰が読んだかを確認できる。</li>
      </ol></section>`));
    },
  });
})();
