// 本物のサーバーにつないで、地図・衛星・潮の流れなどが実際に表示されるかを確かめるテスト
// 使い方: umi-map フォルダで `python3 -m http.server 8765` を起動してから `node tests/live.cjs`
// (インターネットにつながる環境で動かす。GitHub Actions で自動実行している)
const { chromium } = require("playwright");

const BASE = process.env.UMI_URL || "http://localhost:8765/index.html";
let failed = 0, warned = 0;
function check(name, ok, detail, level) {
  const mark = ok ? "OK   " : level === "warn" ? "WARN " : "FAIL ";
  console.log(mark + name + (detail ? "  (" + detail + ")" : ""));
  if (!ok) { if (level === "warn") warned++; else failed++; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// サーバーごとの応答を数える
function watch(page) {
  const stat = {};
  function rec(host, key, extra) {
    stat[host] = stat[host] || { ok: 0, ng: 0, codes: {}, sample: "" };
    stat[host][key]++;
    if (extra) { stat[host].codes[extra] = (stat[host].codes[extra] || 0) + 1; }
  }
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.hostname === "localhost") return;
    const good = r.status() >= 200 && r.status() < 400;
    rec(u.hostname, good ? "ok" : "ng", String(r.status()));
    if (!good && !stat[u.hostname].sample) stat[u.hostname].sample = u.pathname.slice(0, 120);
  });
  page.on("requestfailed", (r) => {
    const u = new URL(r.url());
    if (u.hostname === "localhost") return;
    rec(u.hostname, "ng", (r.failure() || {}).errorText || "failed");
    if (!stat[u.hostname].sample) stat[u.hostname].sample = u.pathname.slice(0, 120);
  });
  return {
    stat,
    reset() { for (const k in stat) delete stat[k]; },
    summary(host) { const s = stat[host]; return s ? "成功" + s.ok + " 失敗" + s.ng + " " + JSON.stringify(s.codes) + (s.sample ? " 例:" + s.sample : "") : "通信なし"; },
    good(host) { const s = stat[host]; return !!s && s.ok > 0 && s.ok >= s.ng; }
  };
}

async function waitFor(fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(500); }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const net = watch(page);

  await page.goto(BASE + "#know");
  await sleep(6000);
  check("読み込み時にエラーが出ない", errors.length === 0, errors.join(" / "));
  check("海底地形図(Esri)", net.good("server.arcgisonline.com"), net.summary("server.arcgisonline.com"));
  check("国土地理院の地図", net.good("cyberjapandata.gsi.go.jp"), net.summary("cyberjapandata.gsi.go.jp"));
  check("文字の書体(Google Fonts)", net.good("fonts.gstatic.com") || net.good("fonts.googleapis.com"), net.summary("fonts.googleapis.com"), "warn");

  // 潮の流れ
  const flowOk = await waitFor(async () => (await page.innerText("#flowStatus")).startsWith("更新"), 30000);
  check("潮の流れ(Open-Meteo)", flowOk, (await page.innerText("#flowStatus")) + " / " + net.summary("marine-api.open-meteo.com"));

  // 下地の写真
  for (const [id, host, name] of [["base-photo", "cyberjapandata.gsi.go.jp", "航空写真(国土地理院)"], ["base-s2", "tiles.maps.eox.at", "衛星写真 Sentinel-2(EOX)"]]) {
    net.reset();
    await page.check("#" + id);
    await sleep(5000);
    check(name, net.good(host), net.summary(host));
  }
  await page.check("#base-ocean");

  // 重ねる地形
  net.reset();
  await page.check("#ov-gebco");
  await sleep(6000);
  check("海底の起伏(GEBCO)", net.good("wms.gebco.net"), net.summary("wms.gebco.net"));
  await page.uncheck("#ov-gebco");
  net.reset();
  await page.check("#ov-hill");
  await sleep(4000);
  check("陸の起伏(国土地理院 陰影起伏図)", net.good("cyberjapandata.gsi.go.jp"), net.summary("cyberjapandata.gsi.go.jp"));
  await page.uncheck("#ov-hill");

  // 宇宙から見た海: 最新の日付と古い日付
  const recent = await page.inputValue("#dateA");
  for (const date of [recent, "2010-08-15"]) {
    await page.check("#sat-none");
    await sleep(1000);
    await page.fill("#dateA", date);
    await page.dispatchEvent("#dateA", "change");
    for (const [id, name] of [["sat-sst", "海面の水温"], ["sat-anom", "水温の平年差"], ["sat-chl", "プランクトン"], ["sat-true", "その日の衛星写真"]]) {
      net.reset();
      await page.check("#" + id);
      await sleep(5000);
      check(name + " " + date + "(NASA GIBS)", net.good("gibs.earthdata.nasa.gov"), net.summary("gibs.earthdata.nasa.gov"));
    }
  }
  await page.fill("#dateA", recent);
  await page.dispatchEvent("#dateA", "change");
  await page.check("#sat-none");

  // NOAA ERDDAP がブラウザから読めるか(読めなくても Open-Meteo で補うので注意だけ)
  const erddap = await page.evaluate(async () => {
    try {
      const r = await fetch("https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json?analysed_sst%5B(2025-08-15T09:00:00Z)%5D%5B(33.6)%5D%5B(129.9)%5D");
      return r.ok ? "読める" : "HTTP " + r.status;
    } catch (e) { return "読めない(" + e.message + ")"; }
  });
  check("NOAA ERDDAP をブラウザから読める", erddap === "読める", erddap, "warn");

  // 海をクリック
  await page.mouse.click(820, 220);
  const popOk = await waitFor(async () => !/問い合わせ中/.test(await page.innerText(".leaflet-popup-content").catch(() => "問い合わせ中")), 40000);
  const pop = await page.innerText(".leaflet-popup-content").catch(() => "");
  check("海をクリックすると水温が出る", popOk && !!(await page.$(".leaflet-popup .vals")), pop.replace(/\s+/g, " ").slice(0, 200));
  check("プランクトンの数値", /mg\/m³/.test(pop), /mg\/m³/.test(pop) ? "" : "数値なし(雲・取得失敗のどちらか)", "warn");
  if (await page.$("#seriesBtn")) {
    await page.click("#seriesBtn");
    await waitFor(async () => !!(await page.$(".leaflet-popup svg")) || /取れませんでした/.test(await page.innerText(".leaflet-popup-content")), 90000);
    const dots = await page.$$eval(".leaflet-popup svg circle", (c) => c.length).catch(() => 0);
    const txt = await page.innerText(".leaflet-popup-content");
    check("20年の水温グラフ", dots >= 10, dots + "点 " + (txt.match(/傾向[^\n]*/) || [""])[0]);
  }
  await page.keyboard.press("Escape");

  // 海ごみ: いまの風
  await page.click("#mode-gomi");
  await page.check("#wind-now");
  const windOk = await waitFor(async () => /から/.test(await page.innerText("#windStatus")), 20000);
  check("いまの風(Open-Meteo)", windOk, await page.innerText("#windStatus"));

  // 藻場を見守る: 年ごとの写真
  await page.click("#mode-moba");
  await page.evaluate(() => window.UMI.map.setView([33.4739, 129.9911], 15));
  const keys = await page.$$eval("#mobaLeft option", (o) => o.map((x) => [x.value, x.textContent]));
  await page.selectOption("#mobaRight", "gsi-now");
  for (const [key, label] of keys) {
    await page.selectOption("#mobaLeft", "gsi-now");
    await sleep(800);
    await page.evaluate(() => window.UMI.map.setView([33.4739 + Math.random() * 0.002, 129.9911], 15));
    await sleep(800);
    net.reset();
    await page.selectOption("#mobaLeft", key);
    await sleep(5000);
    const host = key.startsWith("s2") ? "tiles.maps.eox.at" : "cyberjapandata.gsi.go.jp";
    check("藻場の比較: " + label, net.good(host), net.summary(host), key === "gsi-1975" ? "warn" : undefined);
  }
  await page.screenshot({ path: "live-moba.png" });

  check("最後までエラーが出ない", errors.length === 0, errors.join(" / "));
  await browser.close();
  console.log("\n失敗 " + failed + " 件 / 注意 " + warned + " 件");
  process.exit(failed ? 1 : 0);
})();
