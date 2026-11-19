/* ミセカン 起動と画面の切り替え（#app で従業員アプリ、それ以外は管理画面のタブ） */
'use strict';
(function () {
  App.Store.get();
  function route() {
    const h = location.hash.slice(1) || 'dashboard';
    const isApp = h === 'app';
    document.getElementById('adminView').hidden = isApp;
    document.getElementById('appView').hidden = !isApp;
    document.getElementById('modeAdmin').setAttribute('aria-selected', !isApp);
    document.getElementById('modeApp').setAttribute('aria-selected', isApp);
    document.getElementById('modeAdmin').href = '#' + (App.Admin.current || 'dashboard');
    document.getElementById('storeName').textContent = App.Store.get().settings.storeName;
    if (isApp) App.Staff.render(); else { App.Admin.show(h); window.scrollTo(0, 0); }
  }
  addEventListener('hashchange', route);
  route();
})();
