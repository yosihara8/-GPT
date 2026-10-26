// 外部のサービスをすべて模擬して、地図の主な機能が動くかを確かめるテスト
// 使い方: umi-map フォルダで `python3 -m http.server 8765` を起動してから `node tests/smoke.cjs`
const { chromium } = require("playwright");

const BASE = process.env.UMI_URL || "http://localhost:8765/index.html";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? "OK   " : "FAIL ") + name + (detail ? "  (" + detail + ")" : ""));
  if (!ok) failed++;
}

function marineGrid(url) {
  const lats = url.searchParams.get("latitude").split(",").map(Number);
  const lons = url.searchParams.get("longitude").split(",").map(Number);
  const start = new Date(Date.now() + 9 * 3600e3 - 24 * 3600e3);
  start.setUTCHours(0, 0, 0, 0);
  const time = [];
  for (let h = 0; h < 96; h++) time.push(new Date(start.getTime() + h * 3600e3).toISOString().slice(0, 16));
  return lats.map((la, k) => ({
    latitude: la, longitude: lons[k],
    hourly: {
      time,
      ocean_current_velocity: time.map((_, h) => 1 + 0.6 * Math.sin(h / 2)),
      ocean_current_direction: time.map(() => 50),
      wave_height: time.map(() => 0.9), wave_direction: time.map(() => 315),
      sea_surface_temperature: time.map(() => 21.3)
    }
  }));
}

async function setup(page, opts) {
  const log = { gibs: [], photo: [], marinePoint: 0, erddap: 0, wind: 0 };
  await page.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1") return route.continue();
    if (h.includes("fonts.")) return route.fulfill({ status: 200, body: "" });
    if (h === "gibs.earthdata.nasa.gov") { log.gibs.push(u.pathname); return route.fulfill({ status: 200, contentType: "image/png", body: PNG }); }
    if (h === "server.arcgisonline.com" || h === "cyberjapandata.gsi.go.jp" || h === "tiles.maps.eox.at" || h === "wms.gebco.net") {
      if (h === "tiles.maps.eox.at" || u.pathname.includes("/gazo1/")) log.photo.push(u.pathname);
      return opts.tilesDown ? route.fulfill({ status: 503, body: "" }) : route.fulfill({ status: 200, contentType: "image/png", body: PNG });
    }
    if (h === "marine-api.open-meteo.com") {
      const cors = { "access-control-allow-origin": "*" };
      if (u.searchParams.get("start_date")) {
        log.marinePoint++;
        const y = +u.searchParams.get("start_date").slice(0, 4);
        if (opts.omOldMissing && y < 2024) return route.fulfill({ status: 400, headers: cors, contentType: "application/json", body: '{"error":true,"reason":"out of range"}' });
        const v = 24 + (y - 2004) * 0.05;
        return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ latitude: 33.6, longitude: 129.9, hourly: { time: ["t"], sea_surface_temperature: [v, v + 0.2] } }) });
      }
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(marineGrid(u)) });
    }
    if (h === "api.open-meteo.com") {
      log.wind++;
      return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify({ current: { time: "2026-10-26T10:00", wind_speed_10m: 6.2, wind_direction_10m: 0 } }) });
    }
    if (h === "coastwatch.pfeg.noaa.gov") {
      log.erddap++;
      if (opts.erddapCors) {
        return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify({ table: { columnNames: ["t", "la", "lo", "v"], rows: [["t", 33.6, 129.9, 23.1]] } }) });
      }
      return route.abort("failed");   // ブラウザから読めない状態(CORS)を再現
    }
    return route.abort("failed");
  });
  return log;
}

(async () => {
  const browser = await chromium.launch();

  // ---- 1. 通常の表示(地図画像は読める、NOAA は読めない) ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const log = await setup(page, {});
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    check("読み込み時にエラーが出ない", errors.length === 0, errors.join(" / "));

    const landHidden = await page.evaluate(() => [...document.querySelectorAll(".leaflet-land-pane path")].every((p) => p.getAttribute("fill-opacity") === "0"));
    check("地図画像が読めた時は粗い陸地の塗りを消す", landHidden);

    const status = await page.innerText("#flowStatus");
    check("潮の流れのデータを読み込む", status.startsWith("更新"), status);
    check("時刻スライダーが96時間分", (await page.getAttribute("#flowSlider", "max")) === "95");
    const t0 = await page.innerText("#flowTime");
    await page.click("#flowPlay");
    await page.waitForTimeout(2200);
    const t1 = await page.innerText("#flowTime");
    check("再生すると時刻が進む", t0 !== t1, t0 + " → " + t1);
    await page.click("#flowPlay");

    await page.mouse.click(820, 220);
    await page.waitForSelector(".leaflet-popup .vals", { timeout: 5000 }).catch(() => {});
    const pop = await page.innerText(".leaflet-popup-content").catch(() => "");
    check("海をクリックすると水温が出る(NOAA が読めなくても)", /℃/.test(pop) && /Open-Meteo/.test(pop), pop.slice(0, 80).replace(/\n/g, " "));
    check("いまの流れ・波も出る", /流れ/.test(pop) && /波の高さ/.test(pop));
    check("生き物の適水温の帯が出る", (await page.$$(".leaflet-popup .sp")).length === 11);
    await page.click("#seriesBtn");
    await page.waitForSelector(".leaflet-popup svg", { timeout: 8000 }).catch(() => {});
    const dots = await page.$$eval(".leaflet-popup svg circle", (c) => c.length).catch(() => 0);
    check("20年の水温グラフが出る", dots >= 20, dots + "点");
    await page.keyboard.press("Escape");

    // 衛星データの切り替え
    log.gibs.length = 0;
    await page.check("#sat-chl");
    await page.waitForTimeout(600);
    check("最近の日付のプランクトンは NOAA-20 VIIRS", log.gibs.some((p) => p.includes("VIIRS_NOAA20_Chlorophyll_a")), log.gibs[0]);
    log.gibs.length = 0;
    await page.fill("#dateA", "2010-08-15");
    await page.dispatchEvent("#dateA", "change");
    await page.waitForTimeout(600);
    check("古い日付のプランクトンは Aqua MODIS", log.gibs.some((p) => p.includes("MODIS_Aqua_Chlorophyll_A/default/2010-08-15")), log.gibs[0]);
    log.gibs.length = 0;
    await page.check("#sat-true");
    await page.waitForTimeout(600);
    check("古い日付の衛星写真は Terra MODIS", log.gibs.some((p) => p.includes("MODIS_Terra_CorrectedReflectance_TrueColor")), log.gibs[0]);
    log.gibs.length = 0;
    await page.fill("#dateA", "2026-10-20");
    await page.dispatchEvent("#dateA", "change");
    await page.waitForTimeout(600);
    check("最近の日付の衛星写真は NOAA-20 VIIRS", log.gibs.some((p) => p.includes("VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-10-20/GoogleMapsCompatible_Level9")), log.gibs[0]);

    // 比べる
    log.gibs.length = 0;
    await page.check("#sat-sst");
    await page.click("#cmpBtn");
    await page.waitForTimeout(800);
    const dates = new Set(log.gibs.map((p) => p.split("/")[6]));
    const clip = await page.evaluate(() => document.querySelector(".leaflet-satB-pane").style.clip);
    check("比べるモードで2つの日付を左右に出す", dates.size === 2 && clip.startsWith("rect"), [...dates].join(", "));
    await page.click("#cmpBtn");

    // 海ごみ
    await page.click("#mode-gomi");
    await page.waitForTimeout(400);
    check("「海ごみ」では衛星データの項目を隠す", await page.isHidden("#sat-sst"));
    const coastWinter = await page.$$eval(".leaflet-overlay-pane path", (p) => p.length);
    await page.check("#wind-now");
    await page.waitForTimeout(600);
    const windText = await page.innerText("#windStatus");
    check("いまの風を読み込む", log.wind > 0 && /北から/.test(windText), windText);
    const coastNow = await page.$$eval(".leaflet-overlay-pane path", (p) => p.length);
    check("風向きが変わると寄りやすい海岸も変わる", coastWinter !== coastNow, coastWinter + " → " + coastNow);
    check("漂着ごみの場所が5か所", (await page.$$(".gomi-chip")).length === 5);
    await page.click("#mode-know");
    await page.waitForTimeout(400);
    check("県の観測点が5か所", (await page.$$(".st-badge")).length === 5);

    // 藻場を見守る
    log.photo.length = 0;
    await page.click("#mode-moba");
    await page.waitForTimeout(800);
    check("「藻場を見守る」で年の比較を出す", await page.isVisible("#mobaLeft") && await page.isHidden("#sat-sst"));
    check("「藻場を見守る」では潮の流れを止める", !(await page.isChecked("#ov-flow")));
    check("2018年と2024年の衛星写真を読み込む", log.photo.some((p) => p.includes("s2cloudless-2018")) && log.photo.some((p) => p.includes("s2cloudless-2024")));
    const mclip = await page.evaluate(() => document.querySelector(".leaflet-mobaL-pane").style.clip);
    check("左右に切り分けて表示する", mclip.startsWith("rect") && await page.isVisible("#mobaSwipe"));
    log.photo.length = 0;
    await page.selectOption("#mobaLeft", "gsi-1975");
    await page.waitForTimeout(600);
    check("1974〜78年の航空写真を選べる", log.photo.some((p) => p.includes("/gazo1/")));
    await page.click("#mobaJump button");
    await page.waitForTimeout(600);
    const z = await page.evaluate(() => window.UMI.map.getZoom());
    check("島のボタンで移動する", z === 15, "z" + z);
    await page.click("#mode-know");
    await page.waitForTimeout(600);
    check("「海を知る」に戻ると潮の流れが戻る", await page.isChecked("#ov-flow") && await page.isHidden("#mobaSwipe"));

    // ピン
    await page.click("#pinBtn");
    await page.mouse.click(1150, 140);
    await page.fill(".leaflet-popup textarea", "テスト", { timeout: 5000 });
    await page.waitForTimeout(200);
    check("ピンを置いて保存できる", (await page.innerText("#pinsList")).includes("テスト"));
    await page.click("#pinsList button");
    check("ピンを消せる", !(await page.innerText("#pinsList")).includes("テスト"));
    await page.close();
  }

  // ---- 1b. URL の #gomi で「海ごみ」から始まる ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await setup(page, {});
    await page.goto(BASE + "#gomi");
    await page.waitForTimeout(1200);
    const sel = await page.getAttribute("#mode-gomi", "aria-selected");
    check("#gomi で「海ごみ」から始まる", sel === "true" && (await page.$$(".gomi-chip")).length === 5 && errors.length === 0, errors.join(" / "));
    await page.close();
  }

  // ---- 2. 地図画像が読めない時は陸地データで陸を塗る ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    await setup(page, { tilesDown: true });
    await page.goto(BASE);
    await page.waitForTimeout(1500);
    const filled = await page.evaluate(() => [...document.querySelectorAll(".leaflet-land-pane path")].some((p) => p.getAttribute("fill-opacity") === "1"));
    check("地図画像が読めない時は陸を塗る", filled);
    await page.close();
  }

  // ---- 3. Open-Meteo に古い年が無い時は NOAA(MUR)で補う ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const log = await setup(page, { omOldMissing: true, erddapCors: true });
    await page.goto(BASE);
    await page.waitForTimeout(1200);
    await page.mouse.click(820, 220);
    await page.waitForSelector(".leaflet-popup .vals", { timeout: 5000 }).catch(() => {});
    const pop = await page.innerText(".leaflet-popup-content").catch(() => "");
    check("古い日付は NOAA MUR で補う", /MUR/.test(pop) && log.erddap > 0);
    await page.close();
  }

  // ---- 4. スマートフォンの幅 ----
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await setup(page, {});
    await page.goto(BASE);
    await page.waitForTimeout(1200);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check("スマートフォンで横にはみ出さない", over <= 0, over + "px");
    await page.click("#sheetToggle");
    await page.waitForTimeout(400);
    const open = await page.evaluate(() => document.getElementById("panel").classList.contains("open"));
    check("スマートフォンでパネルを開ける", open);
    await page.close();
  }

  await browser.close();
  console.log(failed ? "\n" + failed + " 件失敗" : "\nすべて成功");
  process.exit(failed ? 1 : 0);
})();
