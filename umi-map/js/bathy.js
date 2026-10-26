// 海底地形図: 水深の色分け・陰影の画像と、等深線(5〜150m)を重ね、クリック地点の水深を返す
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;
  var B = window.UMI_BATHY;
  var row = el("ov-bathy") && el("ov-bathy").closest("label");
  if (!B) { if (row) row.hidden = true; U.depthAt = function () { return null; }; return; }

  map.createPane("bathy");
  map.getPane("bathy").style.zIndex = 300;
  map.createPane("contour");
  map.getPane("contour").style.zIndex = 330;

  var layer = L.layerGroup();
  L.imageOverlay(B.image, B.bounds, { pane: "bathy", opacity: 0.9, interactive: false,
    attribution: "水深: <a href='https://www.gebco.net/' target='_blank'>GEBCO 2024 Grid</a>" }).addTo(layer);

  var MAJOR = { 10: 1, 20: 1, 50: 1, 100: 1, 150: 1 };
  var labeled = {};
  // 長い線から順に、水深ごとに数本だけ数字を付ける(付けすぎると読めない)
  B.contours.slice().sort(function (a, b) { return b.c.length - a.c.length; }).forEach(function (f) {
    var major = !!MAJOR[f.d];
    L.polyline(f.c, {
      pane: "contour", interactive: false, smoothFactor: 1.2,
      color: "#0b2a44", weight: major ? 1.3 : 0.7, opacity: major ? 0.75 : 0.4, dashArray: f.d === 5 ? "3 4" : null
    }).addTo(layer);
    var n = labeled[f.d] || 0;
    if (major && n < 3 && f.c.length > 25) {
      labeled[f.d] = n + 1;
      L.marker(f.c[Math.floor(f.c.length / 2)], { opacity: 0, interactive: false, keyboard: false, pane: "contour" })
        .bindTooltip(f.d + "m", { permanent: true, direction: "center", className: "depth-label" }).addTo(layer);
    }
  });

  // 凡例
  var lg = el("bathyLegend");
  if (lg) {
    var max = B.stops[B.stops.length - 2][0];
    lg.innerHTML = "<div class='gradbar' style='background:linear-gradient(90deg," +
      B.stops.slice(0, -1).map(function (s) { return s[1] + " " + (s[0] / max * 100).toFixed(0) + "%"; }).join(",") + ")'></div>" +
      "<div class='depth-ticks'>" + [0, 20, 50, 100, max].map(function (d) {
        return "<span style='left:" + (d / max * 100) + "%'>" + d + "m</span>";
      }).join("") + "</div>";
  }

  // クリック地点の水深(近くの格子から。陸なら null)
  var G = B.grid;
  U.depthAt = function (lat, lon) {
    var ci = Math.round((lat - G.lat0) / G.step), cj = Math.round((lon - G.lon0) / G.step);
    if (ci < 0 || cj < 0 || ci >= G.nlat || cj >= G.nlon) return null;
    var v = G.d[ci * G.nlon + cj];
    return v === null || v === undefined ? null : v;
  };

  var cb = el("ov-bathy");
  function apply() { if (cb.checked) layer.addTo(map); else map.removeLayer(layer); }
  cb.addEventListener("change", apply);
  apply();
})();
