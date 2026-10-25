// 唐津周辺で公表されている調査・観測の結果を地図に載せる
// 位置は地区名からのおおよその位置。数値は出典の公表値をそのまま載せる
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;

  var SRC = {
    gyojo: { name: "佐賀県玄海水産振興センター「玄海漁場環境情報」令和8年度8月号(調査日 2026年8月4日)", url: "https://www.pref.saga.lg.jp/kiji00320172/index.html" },
    tele: { name: "佐賀県海況テレメータシステム 水質情報(30分ごとの自動観測)", url: "https://telemeter-area.jp/saga/saga/saga.htm" },
    auto: { name: "佐賀県 水温・塩分自動観測データの提供", url: "https://www.pref.saga.lg.jp/kiji00320170/index.html" },
    moba: { name: "佐賀新聞「玄海地区の藻場を大規模調査」", url: "https://www.saga-s.co.jp/articles/-/926343" },
    isoyake: { name: "水産庁 令和6年度磯焼け対策全国協議会資料(佐賀玄海漁協青壮年部)", url: "https://www.jfa.maff.go.jp/j/seibi/attach/pdf/R6_isoyake_kyogikai-8.pdf" },
    blue: { name: "唐津市 ブルーカーボンの取り組み", url: "https://www.city.karatsu.lg.jp/page/35470.html" },
    wind: { name: "佐賀県 唐津市沖洋上風力 漁業環境影響調査 報告書(概要版)", url: "https://www.pref.saga.lg.jp/kiji003111834/" },
    windEnv: { name: "環境省 唐津洋上風力 計画段階環境配慮書への環境大臣意見", url: "https://www.env.go.jp/press/106844.html" },
    windEnv2: { name: "環境省 唐津洋上風力Phase2 計画段階環境配慮書への環境大臣意見", url: "https://www.env.go.jp/press/107494.html" }
  };
  function src(key) {
    var s = SRC[key];
    return "<div class='src'>出典: <a href='" + s.url + "' target='_blank' rel='noopener'>" + s.name + "</a></div>";
  }

  // ---------- 県の観測点 ----------
  // aug: 2026年8月4日の表層水温と平年値(H16〜R7の平均)
  var STATIONS = [
    { n: "唐津湾(幸多里地先)", ll: [33.522, 129.952], aug: [29.8, 27.8], layers: "表層0.5m・中層5m", auto: true,
      note: "自動観測ブイは2025年10月時点でメンテナンスのため更新を停止中と案内されています。" },
    { n: "名護屋浦(名護屋地先)", ll: [33.533, 129.862], aug: [29.0, 26.6], layers: "表層0.5m・中層5m・底層10m(底層で溶存酸素を測定)", auto: true },
    { n: "外津浦", ll: [33.512, 129.848], aug: [29.9, 27.3], layers: "漁場環境調査の定点" },
    { n: "仮屋湾(仮屋地先)", ll: [33.492, 129.826], aug: [30.9, 28.5], layers: "表層0.5m・中層5m・底層10m(底層で溶存酸素を測定)", auto: true },
    { n: "伊万里湾(波多津地先)", ll: [33.398, 129.795], aug: [31.3, 29.8], layers: "表層0.5m・中層5m・底層", auto: true }
  ];
  var stationLayer = L.layerGroup();
  STATIONS.forEach(function (s) {
    var d = s.aug[0] - s.aug[1];
    var icon = L.divIcon({
      className: "", iconSize: [58, 26], iconAnchor: [29, 32], popupAnchor: [0, -30],
      html: "<div class='st-badge'><span class='st-sq'></span>+" + d.toFixed(1) + "℃</div><div class='st-pin'></div>"
    });
    var lo = 24, hi = 32;
    function x(t) { return ((t - lo) / (hi - lo) * 100).toFixed(1); }
    var html = "<div class='pp'><h3>" + s.n + "</h3><div class='ll'>県の観測点(位置はおおよそ)・" + s.layers + "</div>" +
      "<div class='muted' style='margin-top:8px'>2026年8月4日の表層水温と平年値</div>" +
      "<div class='cmp-bars'>" +
      "<div class='cb-row'><span>平年</span><div class='cb-track'><div class='cb-bar norm' style='width:" + x(s.aug[1]) + "%'></div></div><b>" + s.aug[1].toFixed(1) + "℃</b></div>" +
      "<div class='cb-row'><span>2026年</span><div class='cb-track'><div class='cb-bar now' style='width:" + x(s.aug[0]) + "%'></div></div><b>" + s.aug[0].toFixed(1) + "℃</b></div>" +
      "</div><div class='diff'>平年より <b style='color:#b8433a'>+" + d.toFixed(1) + "℃</b> 高い(目盛りは24〜32℃)</div>" +
      (s.note ? "<p class='muted'>" + s.note + "</p>" : "") +
      (s.auto ? "<p style='margin:6px 0'><a href='" + SRC.tele.url + "' target='_blank' rel='noopener'>この地点のいまの水温・塩分・溶存酸素を見る(県のテレメータ)</a></p>" : "") +
      src("gyojo") + "</div>";
    L.marker(s.ll, { icon: icon, keyboard: true, title: s.n }).bindPopup(html, { maxWidth: 320 }).addTo(stationLayer);
  });

  // ---------- 藻場・磯焼けの調査と保全活動 ----------
  var MOBA = [
    { n: "高島", ll: [33.475, 129.989], t: "ガンガゼ駆除の効果確認(令和6年度)",
      text: "駆除した区画では、駆除しなかった区画より海藻の被度が高くなったと報告されています。", s: "isoyake" },
    { n: "鎮西町 串", ll: [33.548, 129.853], t: "藻場の保全とJブルークレジット",
      text: "串地区の藻場保全で、2022年度に佐賀県内で初めてJブルークレジットの認証を受けました。その後も2023年度・2024年度に認証(41.1、35.3、18.5トン-CO2)。地区の位置はおおよそです。", s: "blue" },
    { n: "肥前町 駄竹", ll: [33.425, 129.808], t: "地域グループによる藻場再生",
      text: "地元グループが3年間の活動で藻場の再生に成功したと報告されています。地区の位置はおおよそです。", s: "isoyake" }
  ];
  var mobaLayer = L.layerGroup();
  MOBA.forEach(function (m) {
    L.circleMarker(m.ll, { radius: 10, color: "#3f7d4e", weight: 3, fillColor: "#bfe3c4", fillOpacity: 0.9, dashArray: "3 3" })
      .bindPopup("<div class='pp'><h3>" + m.n + "</h3><div class='ll'>" + m.t + "</div><p>" + m.text + "</p>" + src(m.s) + "</div>", { maxWidth: 320 })
      .addTo(mobaLayer);
  });

  // ---------- 洋上風力の計画海域(計画段階の公表値から描いた目安の円) ----------
  var windLayer = L.layerGroup();
  [
    { n: "神集島の北西の海域", ll: [33.560, 129.940], ha: 2653, text: "計画段階環境配慮書の事業実施想定区域は約2,653ha。", s: "windEnv" },
    { n: "小川島の北東の海域(Phase2)", ll: [33.605, 129.915], ha: null, text: "最大20万kWの計画。環境大臣意見で、藻場など海の生き物への影響を避ける措置が求められています。区域の広さは公表値を確認できていないため、円は位置の目安です。", s: "windEnv2" }
  ].forEach(function (w) {
    var r = w.ha ? Math.sqrt(w.ha * 1e4 / Math.PI) : 1500;
    L.circle(w.ll, { radius: r, color: "#6b5a8e", weight: 2, dashArray: "6 6", fillOpacity: 0.06 })
      .bindPopup("<div class='pp'><h3>洋上風力の計画海域</h3><div class='ll'>" + w.n + "(円は目安で、実際の区域の形ではありません)</div><p>" + w.text +
        "佐賀県は唐津市沖で漁業環境影響調査(2022〜2024年度)を行い、報告書の概要版を公表しています。国は報道時点で「有望な区域」には整理していません。</p>" +
        src(w.s) + src("wind") + "</div>", { maxWidth: 320 })
      .addTo(windLayer);
  });

  function toggle(id, layer) {
    var cb = el(id);
    function apply() { if (cb.checked) layer.addTo(map); else map.removeLayer(layer); }
    cb.addEventListener("change", apply); apply();
  }
  toggle("ov-stations", stationLayer);
  toggle("ov-moba", mobaLayer);
  toggle("ov-wind", windLayer);
})();
