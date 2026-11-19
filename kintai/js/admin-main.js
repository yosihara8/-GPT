/* ミセカン 管理者ページの起動（暗証番号の確認とタブの切り替え） */
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
    const pin = document.getElementById('gatePin').value, err = document.getElementById('gateErr');
    const lock = App.Guard.locked('admin');
    if (lock) { err.textContent = `打ち間違いが続いたため、あと${lock}分ほど入れません。`; return; }
    if (String(pin) !== String(S.get().settings.adminPin)) {
      const l = App.Guard.fail('admin');
      err.textContent = l ? `打ち間違いが${App.Guard.MAX}回続いたため、${l}分間ロックしました。` : '暗証番号が違います。';
      document.getElementById('gatePin').value = ''; return;
    }
    App.Guard.ok('admin');
    open = true; setOpen(true); document.getElementById('gatePin').value = ''; document.getElementById('gateErr').textContent = ''; route();
  };
  document.getElementById('lock').onclick = () => { open = false; setOpen(false); route(); };
  addEventListener('hashchange', route);
  // 15分なにも操作しなければ自動でロック（席を離れたときの のぞき見対策）
  App.idle(15, () => { if (open) { open = false; setOpen(false); route(); document.getElementById('gateErr').textContent = '15分操作がなかったため、ロックしました。'; } });
  route();
})();
