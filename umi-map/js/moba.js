// 藻場を見守る: 同じ場所の衛星写真・航空写真を、2つの年で左右に並べて見比べる
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;
  var GSI = "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>国土地理院</a>";

  function eox(year) {
    return {
      key: "s2-" + year, label: year + "年 衛星写真(Sentinel-2)",
      url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-" + year + "_3857/default/g/{z}/{y}/{x}.jpg",
      max: 15, attr: "Sentinel-2 cloudless " + year + " by <a href='https://s2maps.eu' target='_blank'>EOX</a> (Copernicus Sentinel data)"
    };
  }
  var SOURCES = [
    { key: "gsi-1975", label: "1974〜78年 航空写真(国土地理院)", url: "https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg", max: 17,
      attr: GSI + " 国土画像情報(第一期)" },
    eox(2018), eox(2019), eox(2020), eox(2021), eox(2022), eox(2023), eox(2024),
    { key: "gsi-now", label: "最新の航空写真(国土地理院)", url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", max: 18,
      attr: GSI + " 全国最新写真" }
  ];
  var PLACES = [
    ["高島", [33.4739, 129.9911]], ["神集島", [33.5333, 129.9722]], ["加部島", [33.5560, 129.8821]],
    ["波戸岬", [33.5557, 129.8463]], ["小川島", [33.597, 129.897]], ["加唐島", [33.6008, 129.8561]], ["馬渡島", [33.5731, 129.7594]]
  ];

  ["mobaLeft", "mobaRight"].forEach(function (id) {
    var sel = el(id);
    SOURCES.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.key; o.textContent = s.label;
      sel.appendChild(o);
    });
  });
  el("mobaLeft").value = "s2-2018";
  el("mobaRight").value = "s2-2024";

  var jump = el("mobaJump");
  PLACES.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = p[0];
    b.addEventListener("click", function () { map.setView(p[1], 15); });
    jump.appendChild(b);
  });

  // 左右の写真は専用の層に置き、境目で切り取る
  map.createPane("mobaL"); map.createPane("mobaR");
  map.getPane("mobaL").style.zIndex = 340;
  map.getPane("mobaR").style.zIndex = 341;
  var wrap = map.getContainer().parentNode;
  function add(tag, cls, id) {
    var n = document.createElement(tag);
    n.className = cls; n.id = id; n.hidden = true;
    wrap.appendChild(n);
    return n;
  }
  var divider = add("div", "divider", "mobaDivider");
  var swipe = add("input", "swipe", "mobaSwipe");
  swipe.type = "range"; swipe.min = 0; swipe.max = 1; swipe.step = 0.001; swipe.value = 0.5;
  swipe.setAttribute("aria-label", "比較の境目");
  var labL = add("div", "cmp-label left", "mobaLabelL");
  var labR = add("div", "cmp-label right", "mobaLabelR");

  var left = null, right = null, active = false;
  function find(key) { return SOURCES.filter(function (s) { return s.key === key; })[0]; }
  function make(src, pane) {
    return L.tileLayer(src.url, { pane: pane, maxNativeZoom: src.max, maxZoom: 18, attribution: src.attr });
  }
  function clip() {
    var pl = map.getPane("mobaL"), pr = map.getPane("mobaR");
    if (!active) { pl.style.clip = ""; pr.style.clip = ""; return; }
    var size = map.getSize();
    var nw = map.containerPointToLayerPoint([0, 0]);
    var se = map.containerPointToLayerPoint(size);
    var x = nw.x + size.x * +swipe.value;
    pl.style.clip = "rect(" + [nw.y, x, se.y, nw.x].join("px,") + "px)";
    pr.style.clip = "rect(" + [nw.y, se.x, se.y, x].join("px,") + "px)";
    divider.style.left = (size.x * +swipe.value) + "px";
  }
  function refresh() {
    if (left) { map.removeLayer(left); left = null; }
    if (right) { map.removeLayer(right); right = null; }
    [divider, swipe, labL, labR].forEach(function (n) { n.hidden = !active; });
    if (active) {
      var a = find(el("mobaLeft").value), b = find(el("mobaRight").value);
      left = make(a, "mobaL").addTo(map);
      right = make(b, "mobaR").addTo(map);
      labL.textContent = "← " + a.label;
      labR.textContent = b.label + " →";
    }
    clip();
  }
  el("mobaLeft").addEventListener("change", refresh);
  el("mobaRight").addEventListener("change", refresh);
  swipe.addEventListener("input", clip);
  map.on("move zoom resize", clip);

  U.mobaCompare = function (on) {
    if (active === on) return;
    active = on;
    refresh();
  };
})();
