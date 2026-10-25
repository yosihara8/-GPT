// いまの海: 潮の流れ・波・水温(Open-Meteo Marine の予報モデル)を格子で取り、流れを粒子で動かす
(function () {
  "use strict";
  var U = window.UMI, map = U.map, el = U.el;

  // 玄界灘〜唐津湾を覆う格子(モデルは約8km単位なので、これより細かくしても意味がない)
  var LATS = [], LONS = [];
  for (var la = 33.30; la <= 33.9001; la += 0.075) LATS.push(+la.toFixed(3));
  for (var lo = 129.50; lo <= 130.3001; lo += 0.1) LONS.push(+lo.toFixed(3));

  var API = "https://marine-api.open-meteo.com/v1/marine";
  var REFRESH_MS = 30 * 60 * 1000;

  var data = null;   // { times: [...], u: [t][i][j], v, wave, sst }
  var tNow = 0;      // 表示中の時刻(times の添字、小数で時間を補間)
  var playing = false;

  function buildUrl() {
    var lats = [], lons = [];
    LATS.forEach(function (a) { LONS.forEach(function (b) { lats.push(a); lons.push(b); }); });
    return API + "?latitude=" + lats.join(",") + "&longitude=" + lons.join(",") +
      "&hourly=ocean_current_velocity,ocean_current_direction,wave_height,wave_direction,sea_surface_temperature" +
      "&timezone=Asia%2FTokyo&past_days=1&forecast_days=3&cell_selection=sea";
  }

  function grid(fn) {
    return LATS.map(function (_, i) { return LONS.map(function (_, j) { return fn(i, j); }); });
  }

  function parse(arr) {
    if (!Array.isArray(arr)) arr = [arr];
    var times = arr[0].hourly.time;
    var nT = times.length;
    var u = [], v = [], wave = [], wdir = [], sst = [];
    for (var t = 0; t < nT; t++) { u.push(grid(nul)); v.push(grid(nul)); wave.push(grid(nul)); wdir.push(grid(nul)); sst.push(grid(nul)); }
    arr.forEach(function (pt, k) {
      var i = Math.floor(k / LONS.length), j = k % LONS.length;
      // 近くに海のセルが無い(=陸)格子点は使わない
      if (Math.abs(pt.latitude - LATS[i]) > 0.065 || Math.abs(pt.longitude - LONS[j]) > 0.065) return;
      var h = pt.hourly;
      for (var t = 0; t < nT; t++) {
        var s = h.ocean_current_velocity[t], d = h.ocean_current_direction[t];
        if (s !== null && d !== null) {
          var ms = s / 3.6, r = d * Math.PI / 180;   // km/h → m/s、向きは「流れていく方向」
          u[t][i][j] = ms * Math.sin(r);
          v[t][i][j] = ms * Math.cos(r);
        }
        wave[t][i][j] = h.wave_height[t];
        wdir[t][i][j] = h.wave_direction[t];
        sst[t][i][j] = h.sea_surface_temperature[t];
      }
    });
    return { times: times, u: u, v: v, wave: wave, wdir: wdir, sst: sst, loadedAt: new Date() };
    function nul() { return null; }
  }

  function nowIndex(times) {
    var jst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 13) + ":00";
    var idx = times.indexOf(jst);
    return idx < 0 ? 0 : idx;
  }

  // 格子上の値を双一次補間(陸の格子点は除いて重みを付け直す)
  function bilinear(field, lat, lon) {
    var fi = (lat - LATS[0]) / (LATS[1] - LATS[0]);
    var fj = (lon - LONS[0]) / (LONS[1] - LONS[0]);
    if (fi < 0 || fj < 0 || fi > LATS.length - 1 || fj > LONS.length - 1) return null;
    var i0 = Math.min(Math.floor(fi), LATS.length - 2), j0 = Math.min(Math.floor(fj), LONS.length - 2);
    var di = fi - i0, dj = fj - j0, sum = 0, wsum = 0;
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (c) {
      var val = field[i0 + c[0]][j0 + c[1]];
      if (val === null || val === undefined) return;
      var w = (c[0] ? di : 1 - di) * (c[1] ? dj : 1 - dj);
      sum += val * w; wsum += w;
    });
    return wsum > 0.25 ? sum / wsum : null;
  }
  function sampleUV(lat, lon, t) {
    var t0 = Math.floor(t), t1 = Math.min(t0 + 1, data.times.length - 1), f = t - t0;
    var u0 = bilinear(data.u[t0], lat, lon), v0 = bilinear(data.v[t0], lat, lon);
    if (u0 === null || v0 === null) return null;
    var u1 = bilinear(data.u[t1], lat, lon), v1 = bilinear(data.v[t1], lat, lon);
    if (u1 === null || v1 === null) return [u0, v0];
    return [u0 + (u1 - u0) * f, v0 + (v1 - v0) * f];
  }
  function nearest(field, lat, lon) {
    var best = null, bd = Infinity;
    LATS.forEach(function (a, i) {
      LONS.forEach(function (b, j) {
        var val = field[i][j];
        if (val === null || val === undefined) return;
        var d = (a - lat) * (a - lat) + (b - lon) * (b - lon);
        if (d < bd) { bd = d; best = val; }
      });
    });
    return bd < 0.04 ? best : null;
  }

  // ---------- 粒子アニメーション ----------
  var canvas = document.createElement("canvas");
  canvas.className = "flow-canvas";
  map.getContainer().appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var particles = [], W = 0, H = 0, dpr = 1;
  var SPEED_PX = 1.6;      // 1m/s あたり1コマで進む画面上の距離(見やすく誇張)
  var MAX_AGE = 90;

  function resize() {
    var s = map.getSize();
    dpr = window.devicePixelRatio || 1;
    W = s.x; H = s.y;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }
  function seed() {
    var n = Math.round(Math.min(1400, W * H / 650));
    particles = [];
    for (var k = 0; k < n; k++) particles.push(spawn({}));
    ctx.clearRect(0, 0, W, H);
  }
  function spawn(p) {
    p.x = Math.random() * W; p.y = Math.random() * H;
    p.age = Math.floor(Math.random() * MAX_AGE);
    return p;
  }
  function speedColor(s) {
    // 遅い=青緑、速い=朱色
    if (s < 0.1) return "rgba(160,225,235,0.75)";
    if (s < 0.25) return "rgba(110,215,200,0.85)";
    if (s < 0.4) return "rgba(245,225,120,0.9)";
    if (s < 0.6) return "rgba(245,160,80,0.95)";
    return "rgba(235,90,60,1)";
  }
  var moving = false;
  map.on("movestart zoomstart", function () { moving = true; ctx.clearRect(0, 0, W, H); });
  map.on("moveend zoomend", function () { moving = false; seed(); });
  map.on("resize", resize);

  function frame() {
    requestAnimationFrame(frame);
    if (!data || !el("ov-flow").checked || moving) return;
    if (playing) {
      tNow += 1 / 60;   // 1秒で1時間進む
      if (tNow >= data.times.length - 1) tNow = 0;
      syncTimeUi();
    }
    // 古い線を少しずつ消して尾を引かせる
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "rgba(0,0,0,0.93)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1.8;
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      if (++p.age > MAX_AGE) { spawn(p); p.age = 0; continue; }
      var ll = map.containerPointToLatLng([p.x, p.y]);
      var uv = sampleUV(ll.lat, ll.lng, tNow);
      if (!uv) { spawn(p); continue; }
      var nx = p.x + uv[0] * SPEED_PX, ny = p.y - uv[1] * SPEED_PX;
      ctx.strokeStyle = speedColor(Math.sqrt(uv[0] * uv[0] + uv[1] * uv[1]));
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny;
      if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) spawn(p);
    }
  }

  // ---------- 時刻の操作 ----------
  var DOW = ["日", "月", "火", "水", "木", "金", "土"];
  function timeLabel(idx) {
    var s = data.times[Math.round(idx)];
    var d = new Date(s + ":00+09:00");
    var label = (d.getMonth() + 1) + "月" + d.getDate() + "日(" + DOW[d.getDay()] + ") " + s.slice(11, 16);
    var diff = Math.round(idx) - nowIndex(data.times);
    if (diff === 0) return label + " いま";
    return label + (diff > 0 ? "(" + diff + "時間後の予報)" : "(" + (-diff) + "時間前)");
  }
  function syncTimeUi() {
    el("flowSlider").value = Math.round(tNow);
    el("flowTime").textContent = timeLabel(tNow);
  }
  function setPlaying(on) {
    playing = on;
    el("flowPlay").textContent = on ? "一時停止" : "再生";
    el("flowPlay").setAttribute("aria-pressed", on ? "true" : "false");
  }

  function load() {
    el("flowStatus").textContent = "最新のデータを取得中…";
    return fetch(buildUrl()).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      var keepOffset = data ? tNow - nowIndex(data.times) : 0;
      data = parse(j);
      el("flowSlider").max = data.times.length - 1;
      tNow = Math.max(0, Math.min(data.times.length - 1, nowIndex(data.times) + (playing ? keepOffset : 0)));
      syncTimeUi();
      var hh = ("0" + data.loadedAt.getHours()).slice(-2) + ":" + ("0" + data.loadedAt.getMinutes()).slice(-2);
      el("flowStatus").textContent = "更新 " + hh + "(30分ごとに自動で最新にします)";
      seed();
    }).catch(function () {
      if (!data) el("flowTime").textContent = "データなし";
      el("flowStatus").textContent = "潮の流れのデータを取得できませんでした。通信状況を確認してください。30分後にもう一度試します。";
    });
  }

  el("flowSlider").addEventListener("input", function () { setPlaying(false); tNow = +el("flowSlider").value; syncTimeUi(); });
  el("flowPlay").addEventListener("click", function () { if (data) setPlaying(!playing); });
  el("flowNow").addEventListener("click", function () { if (!data) return; setPlaying(false); tNow = nowIndex(data.times); syncTimeUi(); });
  el("ov-flow").addEventListener("change", function () {
    canvas.hidden = !el("ov-flow").checked;
    if (!el("ov-flow").checked) setPlaying(false);
  });

  // クリック地点の「いまの海」を返す(ポップアップで使う)
  var DIR16 = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];
  function dirName(deg) { return DIR16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16]; }
  U.flowAt = function (lat, lon) {
    if (!data) return null;
    var t = Math.round(tNow);
    var uv = sampleUV(lat, lon, t);
    var out = { label: timeLabel(t) };
    if (uv) {
      var sp = Math.sqrt(uv[0] * uv[0] + uv[1] * uv[1]);
      out.speed = sp;
      out.dir = dirName(Math.atan2(uv[0], uv[1]) * 180 / Math.PI);
    }
    out.wave = nearest(data.wave[t], lat, lon);
    var wd = nearest(data.wdir[t], lat, lon);
    out.waveFrom = wd === null ? null : dirName(wd);
    out.sst = nearest(data.sst[t], lat, lon);
    return out;
  };

  resize();
  requestAnimationFrame(frame);
  load();
  setInterval(load, REFRESH_MS);
})();
