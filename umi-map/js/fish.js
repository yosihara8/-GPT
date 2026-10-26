// 魚を知る: 20年の月平均水温から、生き物ごとに「住みやすい月」が昔と今でどう変わったかを示す
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;
  var H = window.UMI_HISTORY;
  var box = el("fishTable");
  if (!box) return;

  // 適水温の目安(一般的な文献値をまとめたもの。成長段階や地域で変わるので要確認)
  // lo〜hi: 住みやすい、hi〜max: 暑すぎて弱る・逃げる、max 超: 厳しい、lo 未満: 冷たすぎる
  var GROUPS = [
    { name: "回遊してくる魚・イカ", items: [
      { n: "ケンサキイカ", lo: 17, hi: 24, max: 27, note: "呼子のイカ。2018年の佐賀県の漁獲は30年前の約5分の1" },
      { n: "マアジ", lo: 15, hi: 25, max: 28 },
      { n: "マサバ", lo: 13, hi: 22, max: 26 },
      { n: "ブリ", lo: 15, hi: 26, max: 29, note: "暖かい海の魚。日本海側では北へ広がっているが、唐津の夏はそのブリにも暑すぎる月が出てきた" },
      { n: "サワラ", lo: 15, hi: 27, max: 29, note: "1999年ごろから日本海への来遊が急に増えた暖かい海の魚。北の海で増え、九州北部の夏は暑すぎる月が出てきた" }
    ] },
    { name: "根や砂地にすむ魚", items: [
      { n: "マダイ", lo: 15, hi: 26, max: 29 },
      { n: "ヒラメ", lo: 15, hi: 22, max: 26 }
    ] },
    { name: "磯の生き物と海藻", items: [
      { n: "カジメ・クロメ", lo: 12, hi: 24, max: 27, note: "魚の産卵場・稚魚の隠れ家になる海藻の森" },
      { n: "ワカメ", lo: 10, hi: 20, max: 25 },
      { n: "アワビ", lo: 15, hi: 22, max: 27 },
      { n: "ムラサキウニ", lo: 10, hi: 24, max: 28 }
    ] },
    { name: "海藻を食べる側(増えると磯焼けが進む)", bad: true, items: [
      { n: "ガンガゼ", lo: 18, hi: 30, max: 32, note: "南方系のウニ。唐津の磯焼けの主な原因とされる" },
      { n: "アイゴ", lo: 18, hi: 30, max: 32, note: "海藻を食べる魚。水温が高いほどよく食べる" }
    ] },
    { name: "養殖の候補", items: [
      { n: "クロマグロ", lo: 18, hi: 28, max: 30 },
      { n: "トラフグ", lo: 15, hi: 23, max: 27 },
      { n: "マガキ", lo: 12, hi: 25, max: 30 }
    ] }
  ];

  var spot = null;   // [lat, lon] を選んでいない時は海域全体の平均
  var marker = null;

  // 月平均を、その地点(近くの海の格子)か海域全体の平均で取り出す
  function series(lat, lon) {
    var d = H.sst, out = {};
    var cells = null;
    if (lat !== undefined) {
      var ci = Math.round((lat - H.lat0) / H.step), cj = Math.round((lon - H.lon0) / H.step);
      cells = [];
      for (var di = -1; di <= 1; di++) {
        for (var dj = -1; dj <= 1; dj++) {
          var i = ci + di, j = cj + dj;
          if (i >= 0 && j >= 0 && i < H.nlat && j < H.nlon) cells.push(i * H.nlon + j);
        }
      }
    }
    d.months.forEach(function (m, k) {
      var row = d.v[k], sum = 0, n = 0;
      (cells || row.map(function (_, idx) { return idx; })).forEach(function (idx) {
        if (row[idx] !== null && row[idx] !== undefined) { sum += row[idx]; n++; }
      });
      if (n) out[m] = sum / n * d.scale;
    });
    return out;
  }
  // 期間(年の範囲)の、月ごとの平均水温
  function climate(s, y0, y1) {
    var acc = [];
    for (var m = 1; m <= 12; m++) acc.push([0, 0]);
    Object.keys(s).forEach(function (key) {
      var y = +key.slice(0, 4), mo = +key.slice(5);
      if (y < y0 || y > y1) return;
      acc[mo - 1][0] += s[key]; acc[mo - 1][1]++;
    });
    return acc.map(function (a) { return a[1] ? a[0] / a[1] : null; });
  }
  function state(t, sp) {
    if (t === null) return "na";
    if (t < sp.lo) return "cold";
    if (t <= sp.hi) return "ok";
    if (t <= sp.max) return "hot";
    return "bad";
  }
  function count(clim, sp, kind) { return clim.filter(function (t) { return state(t, sp) === kind; }).length; }
  function strip(clim, sp) {
    return "<div class='mstrip'>" + clim.map(function (t, i) {
      return "<span class='m-" + state(t, sp) + "' title='" + (i + 1) + "月 " + (t === null ? "-" : t.toFixed(1) + "℃") + "'></span>";
    }).join("") + "</div>";
  }

  function render() {
    if (!H || !H.sst) { box.innerHTML = "<p class='hint'>水温の月平均データがまだありません。</p>"; return; }
    var s = spot ? series(spot[0], spot[1]) : series();
    var years = Object.keys(s).map(function (k) { return +k.slice(0, 4); });
    var last = Math.max.apply(null, years);
    var past = climate(s, 2003, 2007), now = climate(s, last - 5, last - 1);
    var where = spot ? "地図で選んだ場所(北緯" + spot[0].toFixed(2) + "° 東経" + spot[1].toFixed(2) + "°)" : "唐津周辺の海の平均";
    var jul = [past[6], now[6]];
    var h = "<p class='hint'><b>" + where + "</b>。2003〜07年と" + (last - 5) + "〜" + (last - 1) + "年の月平均水温で比べています。7月は " +
      jul[0].toFixed(1) + "℃ → " + jul[1].toFixed(1) + "℃。</p>";
    h += "<div class='mlegend'><span class='m-ok'></span>住みやすい<span class='m-hot'></span>暑すぎて弱る<span class='m-bad'></span>厳しい<span class='m-cold'></span>冷たすぎる</div>";
    GROUPS.forEach(function (g) {
      h += "<h3 class='fgroup'>" + g.name + "</h3>";
      g.items.forEach(function (sp) {
        var okA = count(past, sp, "ok"), okB = count(now, sp, "ok");
        var hotA = count(past, sp, "hot") + count(past, sp, "bad"), hotB = count(now, sp, "hot") + count(now, sp, "bad");
        var diff = (okB - okA) - (hotB - hotA) * 0.5;
        var verdict, cls;
        if (diff >= 0.75) { verdict = "すみやすくなった"; cls = g.bad ? "v-warn" : "v-up"; }
        else if (diff <= -0.75) { verdict = "すみにくくなった"; cls = g.bad ? "v-up" : "v-down"; }
        else { verdict = "あまり変わらない"; cls = "v-same"; }
        h += "<div class='fish'><div class='fhead'><b>" + sp.n + "</b><span class='verdict " + cls + "'>" + verdict + "</span></div>" +
          "<div class='frow'><span>昔</span>" + strip(past, sp) + "<span class='fnum'>" + okA + "か月</span></div>" +
          "<div class='frow'><span>今</span>" + strip(now, sp) + "<span class='fnum'>" + okB + "か月</span></div>" +
          (hotB !== hotA ? "<div class='fnote'>暑すぎる月 " + hotA + " → " + hotB + "か月</div>" : "") +
          (sp.note ? "<div class='fnote'>" + sp.note + "</div>" : "") + "</div>";
      });
    });
    box.innerHTML = h;
  }

  map.on("click", function (e) {
    if (U.mode !== "fish") return;
    spot = [e.latlng.lat, e.latlng.lng];
    if (!marker) marker = L.circleMarker(spot, { radius: 9, color: "#fff", weight: 3, fillColor: "#e2632b", fillOpacity: 1 });
    marker.setLatLng(spot).addTo(map);
    render();
  });
  el("fishReset").addEventListener("click", function () {
    spot = null;
    if (marker) map.removeLayer(marker);
    render();
  });
  U.onMode = U.onMode || [];
  U.onMode.push(function (m) { if (m !== "fish" && marker) map.removeLayer(marker); else if (m === "fish" && spot && marker) marker.addTo(map); });
  render();
})();
