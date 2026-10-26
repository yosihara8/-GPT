"""唐津周辺の海の月平均(水温・クロロフィル)を NOAA ERDDAP から取り、data/history.js に書き出す。

NOAA ERDDAP はブラウザからは直接読めない(CORS が無い)ため、GitHub Actions でこのスクリプトを動かし、
取れた値を地図に同梱する。約5km間隔の格子で、2002年からの毎月の平均値を持つ。
"""
import csv
import io
import json
import math
import sys
import time
import urllib.parse
import urllib.request

S, N, W, E = 33.30, 33.90, 129.50, 130.30
STEP = 0.05
ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/"

# 試すデータセット(先に書いたものから順に)。dims は緯度経度より前に入る次元の数
SST_SETS = [("jplMURSST41mday", "sst", 0), ("jplMURSST41mday", "analysed_sst", 0)]
CHL_SETS = [("nesdisVHNnoaa20chlaMonthly", "chlor_a", 1), ("erdMH1chlamday", "chlorophyll", 0)]


def fetch(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=300) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # noqa: BLE001
            print("  retry", k + 1, e, file=sys.stderr)
            time.sleep(5 * (k + 1))
    return None


def info(ds):
    """データセットの格子の間隔(度)と緯度の向きを調べる"""
    t = fetch(ERDDAP.replace("griddap/", "info/") + ds + "/index.csv")
    if not t:
        return None
    sp = {}
    for row in csv.reader(io.StringIO(t)):
        if len(row) >= 5 and row[0] == "dimension" and row[1] in ("latitude", "longitude"):
            for part in row[4].split(","):
                if "averageSpacing" in part:
                    sp[row[1]] = float(part.split("=")[1])
    return sp


def grab(ds, var, extra_dims):
    sp = info(ds)
    if not sp or "latitude" not in sp:
        print(ds, "の情報を取れませんでした")
        return None
    stride_lat = max(1, round(STEP / abs(sp["latitude"])))
    stride_lon = max(1, round(STEP / abs(sp["longitude"])))
    lat_rng = "[(%.2f):%d:(%.2f)]" % ((S, stride_lat, N) if sp["latitude"] > 0 else (N, stride_lat, S))
    lon_rng = "[(%.2f):%d:(%.2f)]" % (W, stride_lon, E)
    q = var + "[(2002-01-01T00:00:00Z):1:(last)]" + "[(0.0)]" * extra_dims + lat_rng + lon_rng
    url = ERDDAP + ds + ".csv0?" + urllib.parse.quote(q, safe="[]():,")
    print("取得:", url)
    t = fetch(url)
    if not t:
        return None
    nlat = int(round((N - S) / STEP)) + 1
    nlon = int(round((E - W) / STEP)) + 1
    months, grid = [], {}
    for row in csv.reader(io.StringIO(t)):
        if len(row) < 3 + extra_dims:
            continue
        mon = row[0][:7]
        la, lo = float(row[1 + extra_dims]), float(row[2 + extra_dims])
        try:
            v = float(row[-1])
        except ValueError:
            v = float("nan")
        i, j = int(round((la - S) / STEP)), int(round((lo - W) / STEP))
        if not (0 <= i < nlat and 0 <= j < nlon):
            continue
        if mon not in grid:
            months.append(mon)
            grid[mon] = [None] * (nlat * nlon)
        if not math.isnan(v):
            grid[mon][i * nlon + j] = v
    if not months:
        return None
    return {"dataset": ds, "months": months, "nlat": nlat, "nlon": nlon, "grid": grid}


def pack(res, scale):
    # 値は整数にして小さく持つ(水温は0.1℃、クロロフィルは0.01mg/m3単位)
    return {
        "dataset": res["dataset"],
        "months": res["months"],
        "scale": scale,
        "v": [[None if x is None else int(round(x / scale)) for x in res["grid"][m]] for m in res["months"]],
    }


def main():
    out = {"lat0": S, "lon0": W, "step": STEP,
           "nlat": int(round((N - S) / STEP)) + 1, "nlon": int(round((E - W) / STEP)) + 1,
           "built": time.strftime("%Y-%m-%d")}
    for key, sets, scale in (("sst", SST_SETS, 0.1), ("chl", CHL_SETS, 0.01)):
        for ds, var, extra in sets:
            res = grab(ds, var, extra)
            if res:
                if key == "sst":
                    # 値がケルビンで来る時は摂氏に直す
                    sample = [x for m in res["months"] for x in res["grid"][m] if x is not None][:50]
                    if sample and sum(sample) / len(sample) > 200:
                        for m in res["months"]:
                            res["grid"][m] = [None if x is None else x - 273.15 for x in res["grid"][m]]
                out[key] = pack(res, scale)
                print(key, ds, len(res["months"]), "か月", res["months"][0], "〜", res["months"][-1])
                break
        else:
            print(key, "は取れませんでした")
    if "sst" not in out:
        sys.exit("水温が取れなかったので書き出しません")
    with open("data/history.js", "w", encoding="utf-8") as f:
        f.write("// 唐津周辺の海の月平均(NOAA ERDDAP から tools/build_history.py で作成。手で編集しない)\n")
        f.write("window.UMI_HISTORY = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print("書き出し: data/history.js")


if __name__ == "__main__":
    main()
