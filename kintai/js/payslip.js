/* ミセカン 給与明細の表示（管理者ページ・従業員ページで共通） */
'use strict';
(function () {
  const U = App.U;
  /*
   * 記載している主な項目：支給額と源泉徴収税額・社会保険料等の額（所得税法231条・同施行規則100条）、
   * 計算期間・労働日数・労働時間数・時間外/深夜労働時間数・賃金と控除の内訳（賃金台帳と同じ項目：労働基準法施行規則54条）
   */
  App.payslipHtml = function (p, opt) {
    opt = opt || {};
    const row = (l, v, cls) => `<tr class="${cls || ''}"><th>${l}</th><td class="r num">${v}</td></tr>`;
    return `<div class="slip">
      <div class="slip-head"><div><b class="slip-title">給与明細書</b><span class="slip-ym">${U.ymLabel(p.ym)}分${opt.draft ? '（見込み・未確定）' : ''}</span></div>
        <div class="slip-to"><b>${U.esc(p.name)}</b> 様<br><small class="muted">${U.esc(opt.employer || '')} ${U.esc(p.storeName || '')}</small></div></div>
      <dl class="slip-meta"><div><dt>計算期間</dt><dd>${U.label(p.periodStart)}〜${U.label(p.periodEnd)}</dd></div><div><dt>支給日</dt><dd>${U.label(p.payDate)}</dd></div></dl>
      <div class="slip-grid">
        <table class="slip-t"><caption>勤怠</caption>${row('時給', U.yen(p.wage))}${row('労働日数', p.days + '日')}${row('労働時間数', U.hm(p.workMin))}${row('時間外労働時間数', U.hm(p.otMin))}${p.ot60Min ? row('うち月60時間超', U.hm(p.ot60Min)) : ''}${row('深夜労働時間数', U.hm(p.nightMin))}</table>
        <table class="slip-t"><caption>支給</caption>${row('基本給（時給×労働時間）', U.yen(p.base))}${row('時間外労働手当', U.yen(p.otPay))}${row('深夜労働手当', U.yen(p.nightPay))}${row('通勤手当（非課税）', U.yen(p.transport))}${row('総支給額', U.yen(p.gross), 'total')}</table>
        <table class="slip-t"><caption>控除</caption>${row('雇用保険料', U.yen(p.empIns))}${row('社会保険料', U.yen(p.social))}${row('所得税（源泉徴収税額）', U.yen(p.tax))}${row('控除合計', U.yen(p.deductions), 'total')}</table>
      </div>
      <div class="slip-net"><span>差引支給額</span><b class="num">${U.yen(p.net)}</b></div>
      ${p.taxNote ? `<p class="notice">${U.esc(p.taxNote)}</p>` : ''}
      <p class="slip-foot">課税支給額 ${U.yen(p.taxable)} ・ 割増：時間外25%（月60時間超は50%）・深夜25%</p>
    </div>`;
  };

})();
