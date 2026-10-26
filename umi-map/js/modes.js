// 目的(海を知る・藻場を見守る・海ごみ)の切り替え。目的ごとにパネルの項目と地図の層を出し分ける
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;
  var MODES = ["know", "moba", "gomi"];
  var VIEW = {
    know: null,
    moba: { center: [33.54, 129.90], zoom: 12 },
    gomi: { center: [33.55, 129.88], zoom: 11 }
  };
  var current = null;
  var savedSat = null;

  function fire(node) { node.dispatchEvent(new Event("change", { bubbles: true })); }

  function apply(mode, moveMap) {
    if (MODES.indexOf(mode) < 0) mode = "know";
    if (mode === current) return;
    current = mode;

    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.setAttribute("aria-selected", t.dataset.mode === mode ? "true" : "false");
    });
    document.querySelectorAll(".sec[data-modes]").forEach(function (sec) {
      sec.hidden = sec.dataset.modes.split(" ").indexOf(mode) < 0;
    });
    // 層: その目的に無い層は消し、戻ってきたら元の状態に戻す
    document.querySelectorAll("input[type='checkbox'][data-modes]").forEach(function (cb) {
      var inMode = cb.dataset.modes.split(" ").indexOf(mode) >= 0;
      if (!inMode && cb.checked) { cb.dataset.was = "1"; cb.checked = false; fire(cb); }
      else if (inMode && cb.dataset.was === "1") { delete cb.dataset.was; cb.checked = true; fire(cb); }
    });
    // 衛星データと「むかしと比べる」は「海を知る」だけで使う
    if (mode !== "know") {
      if (el("cmpBtn").getAttribute("aria-pressed") === "true") el("cmpBtn").click();
      var on = document.querySelector("input[name='sat']:checked");
      if (on && on.value !== "none") { savedSat = on.id; el("sat-none").checked = true; fire(el("sat-none")); }
    } else if (savedSat) {
      el(savedSat).checked = true; fire(el(savedSat)); savedSat = null;
    }
    if (U.mobaCompare) U.mobaCompare(mode === "moba");

    if (moveMap && VIEW[mode]) map.setView(VIEW[mode].center, VIEW[mode].zoom);
    try { localStorage.setItem("umi-map-mode", mode); } catch (e) { /* 覚えられない環境では毎回「海を知る」 */ }
    if (location.hash.slice(1) !== mode) {
      try { history.replaceState(null, "", "#" + mode); } catch (e) { /* 書き換えられない環境では無視 */ }
    }
  }

  document.querySelectorAll(".mode-tab").forEach(function (t) {
    t.addEventListener("click", function () { apply(t.dataset.mode, true); });
  });
  window.addEventListener("hashchange", function () { apply(location.hash.slice(1), true); });

  var start = location.hash.slice(1);
  if (MODES.indexOf(start) < 0) {
    try { start = localStorage.getItem("umi-map-mode") || "know"; } catch (e) { start = "know"; }
  }
  apply(start, true);
  U.setMode = function (m) { apply(m, true); };
})();
