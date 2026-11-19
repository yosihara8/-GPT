/* ミセカン 管理者ページの起動（PINの確認とタブの切り替え） */
'use strict';
(function () {
  const S = App.Store;
  const KEY = 'misekan.adminOpen';
  const isOpen = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const setOpen = v => { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch (e) {} };
  let open = isOpen();

  function route() {
    document.getElementById('storeName').textContent = S.get().settings.storeName;
    document.getElementById('gate').hidden = open;
    document.getElementById('adminView').hidden = !open;
    document.getElementById('lock').hidden = !open;
    if (!open) { setTimeout(() => document.getElementById('gatePin').focus(), 0); return; }
    App.Admin.show(location.hash.slice(1) || 'dashboard');
    window.scrollTo(0, 0);
  }
  document.getElementById('gateForm').onsubmit = e => {
    e.preventDefault();
    const pin = document.getElementById('gatePin').value;
    if (String(pin) !== String(S.get().settings.adminPin)) { document.getElementById('gateErr').textContent = 'PINが違います。'; return; }
    open = true; setOpen(true); document.getElementById('gatePin').value = ''; document.getElementById('gateErr').textContent = ''; route();
  };
  document.getElementById('lock').onclick = () => { open = false; setOpen(false); route(); };
  addEventListener('hashchange', route);
  route();
})();
