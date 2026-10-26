#!/usr/bin/env bash
# 外部サービスの状態を調べて表示する(GitHub Actions で実行)
set -u

echo "== NASA GIBS: 使えるクロロフィル・水温の層と期間 =="
curl -s https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml -o /tmp/caps.xml
python3 - <<'PY'
import re
x = open("/tmp/caps.xml", encoding="utf-8").read()
for layer in re.findall(r"<Layer>(.*?)</Layer>", x, re.S):
    ident = re.search(r"<ows:Identifier>(.*?)</ows:Identifier>", layer)
    if not ident: continue
    name = ident.group(1)
    if not re.search(r"Chlorophyll|Sea_Surface_Temp|CorrectedReflectance_TrueColor", name): continue
    if "epsg" in name.lower(): continue
    tms = ",".join(re.findall(r"<TileMatrixSet>(.*?)</TileMatrixSet>", layer))
    times = re.findall(r"<Value>(.*?)</Value>", layer)
    t = (times[0] + (" ... " + times[-1] if len(times) > 1 else "")) if times else "-"
    print(name, "|", tms, "|", t[:160])
PY

echo
echo "== GIBS: 失敗したタイルの応答 =="
for u in \
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies/default/2010-08-15/GoogleMapsCompatible_Level7/7/51/110.png" \
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_Chlorophyll_A/default/2010-08-15/GoogleMapsCompatible_Level7/7/51/110.png" \
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_Chlorophyll_a/default/2026-10-20/GoogleMapsCompatible_Level7/7/51/110.png"; do
  echo "-- $u"
  curl -s -D - -o /tmp/body "$u" | grep -iE "^HTTP|content-type|access-control"
  head -c 300 /tmp/body | tr -d '\0' | grep -a . | head -5
done

echo
echo "== ERDDAP: ブラウザから読めるか(CORS ヘッダー) =="
for host in https://coastwatch.pfeg.noaa.gov https://coastwatch.noaa.gov https://upwell.pfeg.noaa.gov https://oceanwatch.pifsc.noaa.gov https://polarwatch.noaa.gov https://erddap.ifremer.fr; do
  h=$(curl -s -m 20 -D - -o /dev/null -H "Origin: https://example.com" "$host/erddap/info/index.json?page=1&itemsPerPage=1" | grep -iE "^HTTP|access-control-allow-origin" | tr '\r\n' '  ')
  echo "$host  $h"
done

echo
echo "== ERDDAP: 唐津沖のクロロフィルを取れるデータセット =="
for ds in "https://coastwatch.noaa.gov/erddap/info/noaacwNPPN20VIIRSchlociDaily/index.csv" \
          "https://coastwatch.pfeg.noaa.gov/erddap/info/nesdisVHNnoaa20chlaDaily/index.csv" \
          "https://coastwatch.pfeg.noaa.gov/erddap/info/nesdisVHNnoaa20chlaWeekly/index.csv"; do
  echo "-- $ds"
  curl -s -m 30 "$ds" | grep -E '^(dimension|variable),' | head -8
done
