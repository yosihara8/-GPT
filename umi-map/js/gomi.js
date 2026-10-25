// 海ごみ: 報告されている漂着の多い場所と、風を正面から受けてごみが寄りやすい向きの海岸
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;
  var PREVIEW = !!window.UMI_PREVIEW;

  var SRC = {
    pref: { name: "佐賀県「世界海洋プラスチックセンター(仮称)と海岸のプラごみについて」", url: "https://www.pref.saga.lg.jp/kiji003110148/index.html" },
    ff: { name: "NPO法人唐津Farm&Food「ビーチクリーン・海洋プラスチック問題」", url: "https://karatsu-f-f.com/hadomisaki.html" },
    yomiuri: { name: "読売新聞「大量のごみが流れ着く波戸岬、海洋プラスチックごみ教育施設オープン」", url: "https://news.yahoo.co.jp/articles/4670ce3f0c67b1663a14225802a819d0def8160b" },
    hiroi: { name: "唐津市「海岸漂着物専用ごみ箱『拾い箱』」", url: "https://www.city.karatsu.lg.jp/page/3824.html" },
    takashima: { name: "唐津Farm&Food「唐津の離島・高島で全校児童がビーチクリーン」", url: "https://prtimes.jp/main/html/rd/p/000000164.000142434.html" }
  };
  function src(keys) {
    return keys.map(function (k) {
      return "<div class='src'>出典: <a href='" + SRC[k].url + "' target='_blank' rel='noopener'>" + SRC[k].name + "</a></div>";
    }).join("");
  }

  // ---------- 報告されている漂着ごみの場所 ----------
  var SPOTS = [
    { n: "波戸岬", ll: [33.5557, 129.8463], big: true, pos: "波戸岬の位置",
      text: "県は「付近で最も海岸のプラごみ汚染がひどい場所」と説明しています。漂着ごみの約8割がプラスチックで、約6〜7割が中国・韓国・ベトナム・ロシアなどの海外製です。" +
        "ビーチクリーンは2025年10月20日までに延べ14回・2,250人が参加し、燃えるごみ2,310袋などを回収。2024年4月の1回だけで、燃えるごみ300袋・燃えないごみ50袋・粗大プラスチック軽トラ15台分でした。" +
        "海洋プラスチックを学ぶ施設PLAPLAがあり、誰でも漂着ごみを入れられる「拾い箱」も置かれています。",
      s: ["pref", "ff", "yomiuri", "hiroi"] },
    { n: "馬渡島", ll: [33.5731, 129.7594], pos: "島の位置(ごみを回収した田尻浜の正確な位置は未確認)",
      text: "田尻浜のビーチクリーンで、軽トラック2台分の粗大ごみと34袋のごみを回収。発泡スチロール、ブイ、漁網などの大きなごみに加え、ペットボトルや空き缶もありました。",
      s: ["ff"] },
    { n: "高島", ll: [33.4739, 129.9911], pos: "島の位置",
      text: "2026年の小学生のビーチクリーンで、ごみ袋8袋と、漁具のブイ・タンクなどリヤカー2台分を回収。",
      s: ["takashima"] },
    { n: "加唐島", ll: [33.6008, 129.8561], pos: "島の位置", text: "2024年に小学生の環境学習でビーチクリーンを実施(回収量は未確認)。", s: ["takashima"] },
    { n: "小川島", ll: [33.597, 129.897], pos: "島の位置", text: "2023年に小学生の環境学習でビーチクリーンを実施(回収量は未確認)。", s: ["takashima"] }
  ];
  var spotLayer = L.layerGroup();
  SPOTS.forEach(function (g) {
    var icon = L.divIcon({
      className: "", iconSize: [g.big ? 64 : 44, 22], iconAnchor: [g.big ? 32 : 22, -8],
      html: "<div class='gomi-chip" + (g.big ? " big" : "") + "'>" + (g.big ? "漂着ごみ 多" : "ごみ") + "</div>"
    });
    L.marker(g.ll, { icon: icon, title: g.n + "の漂着ごみ" })
      .bindPopup("<div class='pp'><h3>" + g.n + "の漂着ごみ</h3><div class='ll'>地図上の点: " + g.pos + "</div><p>" + g.text + "</p>" + src(g.s) + "</div>", { maxWidth: 320 })
      .addTo(spotLayer);
  });

  // ---------- 風を正面から受ける海岸 ----------
  // 海岸線の各区間について「海側を向いた方角」を求め、風が吹いてくる方角と近く、
  // しかも風上6km以内に島や岬などの風よけが無い区間を塗る。
  // 浮いているごみは風と流れで岸に押し付けられるので、風上に開けた海岸ほど寄りやすい。
  var BOX = { s: 33.40, n: 33.66, w: 129.70, e: 130.08 };
  var segments = [];   // { a: [lat, lng], b: [lat, lng], face: 方角(度) }
  (function buildSegments() {
    if (!window.UMI_LAND) return;
    window.UMI_LAND.features.forEach(function (f) {
      f.geometry.coordinates.forEach(function (poly) {
        var ring = poly[0];
        var k = Math.cos(33.5 * Math.PI / 180);
        var area = 0;
        for (var i = 0; i < ring.length - 1; i++) area += ring[i][0] * k * ring[i + 1][1] - ring[i + 1][0] * k * ring[i][1];
        var ccw = area > 0;
        for (var j = 0; j < ring.length - 1; j++) {
          var p = ring[j], q = ring[j + 1];
          var mlat = (p[1] + q[1]) / 2, mlng = (p[0] + q[0]) / 2;
          if (mlat < BOX.s || mlat > BOX.n || mlng < BOX.w || mlng > BOX.e) continue;
          var dx = (q[0] - p[0]) * k, dy = q[1] - p[1];
          if (dx === 0 && dy === 0) continue;
          // 反時計回りの輪なら右手側、時計回りなら左手側が海
          var nx = ccw ? dy : -dy, ny = ccw ? -dx : dx;
          var face = (Math.atan2(nx, ny) * 180 / Math.PI + 360) % 360;
          segments.push({ a: [p[1], p[0]], b: [q[1], q[0]], face: face });
        }
      });
    });
  })();

  // 陸地を約200m四方の升目に塗った表。風上に陸があって守られている海岸(湾の奥など)を除くのに使う
  var GRID = { s: 33.15, n: 33.95, w: 129.45, e: 130.35, step: 0.002 };
  var landGrid = (function () {
    if (!window.UMI_LAND) return null;
    var cols = Math.round((GRID.e - GRID.w) / GRID.step), rows = Math.round((GRID.n - GRID.s) / GRID.step);
    var c = document.createElement("canvas");
    c.width = cols; c.height = rows;
    var g = c.getContext("2d");
    g.fillStyle = "#000";
    window.UMI_LAND.features.forEach(function (f) {
      f.geometry.coordinates.forEach(function (poly) {
        g.beginPath();
        poly.forEach(function (ring) {
          ring.forEach(function (pt, i) {
            var x = (pt[0] - GRID.w) / GRID.step, y = (GRID.n - pt[1]) / GRID.step;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          });
          g.closePath();
        });
        g.fill("evenodd");
      });
    });
    var d = g.getImageData(0, 0, cols, rows).data;
    var out = new Uint8Array(cols * rows);
    for (var k = 0; k < cols * rows; k++) out[k] = d[k * 4 + 3] > 127 ? 1 : 0;
    return { cols: cols, rows: rows, cells: out };
  })();
  function isLand(lat, lng) {
    if (!landGrid) return false;
    var x = Math.floor((lng - GRID.w) / GRID.step), y = Math.floor((GRID.n - lat) / GRID.step);
    if (x < 0 || y < 0 || x >= landGrid.cols || y >= landGrid.rows) return false;
    return landGrid.cells[y * landGrid.cols + x] === 1;
  }
  // 区間の中ほどから風上へ向かってたどり、近くに陸(風よけ)があるかを見る
  var FETCH_KM = 6;
  function openToWind(sg) {
    var lat = (sg.a[0] + sg.b[0]) / 2, lng = (sg.a[1] + sg.b[1]) / 2;
    var r = windFrom * Math.PI / 180, k = Math.cos(lat * Math.PI / 180);
    for (var km = 0.5; km <= FETCH_KM; km += 0.25) {
      if (isLand(lat + Math.cos(r) * km / 111, lng + Math.sin(r) * km / (111 * k))) return false;
    }
    return true;
  }

  var coastLayer = L.layerGroup();
  var windFrom = 315;   // 冬の北西の季節風
  function drawCoast() {
    coastLayer.clearLayers();
    segments.forEach(function (sg) {
      var d = Math.abs(((sg.face - windFrom) + 540) % 360 - 180);
      if (d > 60 || !openToWind(sg)) return;
      var strong = d <= 30;
      L.polyline([sg.a, sg.b], {
        color: strong ? "#c2410c" : "#f59e0b", weight: strong ? 5 : 3.5, opacity: 0.95, lineCap: "round", interactive: false
      }).addTo(coastLayer);
    });
  }

  var DIR16 = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
  function dirName(deg) { return DIR16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]; }

  var liveTimer = null;
  function loadWind() {
    el("windStatus").textContent = "いまの風を取得中…";
    fetch("https://api.open-meteo.com/v1/forecast?latitude=33.53&longitude=129.90&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Asia%2FTokyo")
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (j) {
        windFrom = j.current.wind_direction_10m;
        el("windStatus").textContent = j.current.time.slice(11, 16) + " の風: " + dirName(windFrom) + "から " + j.current.wind_speed_10m.toFixed(1) + "m/s(30分ごとに更新)";
        drawCoast();
      })
      .catch(function () { el("windStatus").textContent = "いまの風を取得できませんでした。冬の北西風で表示しています。"; windFrom = 315; drawCoast(); });
  }
  function setMode(mode) {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    if (mode === "now") {
      loadWind();
      liveTimer = setInterval(loadWind, 30 * 60 * 1000);
    } else {
      windFrom = 315;
      el("windStatus").textContent = "冬(11〜3月)に多い北西の季節風で表示しています。";
      drawCoast();
    }
  }
  document.querySelectorAll("input[name='windMode']").forEach(function (r) {
    r.addEventListener("change", function () { if (r.checked) setMode(r.value); });
  });
  if (PREVIEW) {
    el("wind-now").disabled = true;
    el("wind-now").closest("label").title = "プレビュー版では使えません";
  }

  function toggle(id, layer) {
    var cb = el(id);
    function apply() { if (cb.checked) layer.addTo(map); else map.removeLayer(layer); }
    cb.addEventListener("change", apply); apply();
  }
  setMode("winter");
  toggle("ov-gomi", spotLayer);
  toggle("ov-coast", coastLayer);
})();
