"""唐津周辺の海底地形(水深)から、見やすい海底地形図を作る。

GEBCO 2024(約450m単位の世界の海底地形)の必要な範囲だけを読み、次のものを書き出す。
  data/bathy.png  水深の色分けと陰影(陸は透明)。Web メルカトル図法に合わせて行を並べ直してある
  data/bathy.js   画像の範囲、クリックで水深を引くための格子、等深線(5〜150m)

GitHub Actions(.github/workflows/umi-map-data.yml)で動かす。
"""
import json
import math
import os

import numpy as np
import rasterio
from rasterio.windows import from_bounds
from matplotlib import pyplot as plt
from PIL import Image
from scipy import ndimage

SRC = os.environ.get("BATHY_SRC") or "/vsicurl/https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/alexgleith/gebco-2024/GEBCO_2024.tif"
S, N, W, E = 33.15, 34.00, 129.40, 130.40
LEVELS = [5, 10, 20, 30, 40, 50, 60, 80, 100, 120, 150]
UPSCALE = 4          # 画像は元の格子の4倍の細かさでなめらかにする

# 水深の色(浅い所は明るい水色、深くなるほど濃い紺)。漁師さんが見慣れた海図の色に寄せる
STOPS = [
    (0, (214, 241, 245)), (10, (178, 228, 238)), (20, (138, 208, 228)), (30, (101, 182, 214)),
    (50, (70, 150, 196)), (75, (48, 118, 172)), (100, (33, 89, 145)), (150, (22, 62, 112)), (250, (14, 40, 80)),
]


def color_for(depth):
    d = np.clip(depth, 0, STOPS[-1][0])
    out = np.zeros(depth.shape + (3,), dtype=float)
    for (d0, c0), (d1, c1) in zip(STOPS[:-1], STOPS[1:]):
        m = (d >= d0) & (d <= d1)
        t = ((d - d0) / (d1 - d0))[m]
        for k in range(3):
            out[..., k][m] = c0[k] + (c1[k] - c0[k]) * t
    return out


def merc_y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def main():
    with rasterio.open(SRC) as src:
        win = from_bounds(W, S, E, N, src.transform).round_offsets().round_lengths()
        elev = src.read(1, window=win).astype(float)
        tr = src.window_transform(win)
    nlat, nlon = elev.shape
    lon0, lat_top = tr.c, tr.f
    step = tr.a
    print("格子", nlat, "x", nlon, "間隔", step)
    depth = -elev                      # 海は正の水深、陸は負
    sea = depth > 0

    # --- クリック用の格子(下から上、メートル単位の整数、陸は null) ---
    rows = []
    for i in range(nlat - 1, -1, -1):
        rows.extend([int(round(v)) if v > 0 else None for v in depth[i]])
    grid = {"lat0": lat_top - step * nlat + step / 2, "lon0": lon0 + step / 2, "step": step,
            "nlat": nlat, "nlon": nlon, "d": rows}

    # --- 画像: なめらかにしてから、メルカトルの行に並べ直す ---
    fine = ndimage.zoom(np.where(sea, depth, 0), UPSCALE, order=1)
    sea_f = ndimage.zoom(sea.astype(float), UPSCALE, order=1) > 0.5
    fh, fw = fine.shape
    y_top, y_bot = merc_y(lat_top), merc_y(lat_top - step * nlat)
    out_h = fh
    lat_rows = [math.degrees(2 * math.atan(math.exp(y_top - (y_top - y_bot) * (r + 0.5) / out_h)) - math.pi / 2)
                for r in range(out_h)]
    src_rows = np.clip(((lat_top - np.array(lat_rows)) / (step / UPSCALE)).astype(int), 0, fh - 1)
    fine = fine[src_rows]
    sea_f = sea_f[src_rows]

    rgb = color_for(fine)
    # 陰影(北西から光を当てる)で海底の起伏を浮かび上がらせる
    # (元のデータは約450m単位なので、なめらかにしてから陰影を付け、細かいまだら模様を抑える)
    gy, gx = np.gradient(ndimage.gaussian_filter(fine, 3))
    shade = np.clip(1.0 + (gx - gy) * 0.05, 0.82, 1.15)
    rgb = np.clip(rgb * shade[..., None], 0, 255)
    alpha = np.where(sea_f, 235, 0)
    img = np.dstack([rgb, alpha]).astype(np.uint8)
    Image.fromarray(img, "RGBA").save("data/bathy.png", optimize=True)
    print("画像", fw, "x", out_h)

    # --- 等深線 ---
    lons = lon0 + step * (np.arange(nlon) + 0.5)
    lats = lat_top - step * (np.arange(nlat) + 0.5)
    smooth = ndimage.gaussian_filter(np.where(sea, depth, -5), 0.7)
    cs = plt.contour(lons, lats, smooth, levels=LEVELS)
    feats = []
    for lev, segs in zip(cs.levels, cs.allsegs):
        for seg in segs:
            if len(seg) < 12:     # 小さな切れ端は線が散らかるので描かない
                continue
            feats.append({"d": int(lev), "c": [[round(float(y), 4), round(float(x), 4)] for x, y in seg]})
    print("等深線", len(feats), "本")

    out = {
        "source": "GEBCO Compilation Group (2024) GEBCO 2024 Grid",
        "bounds": [[lat_top - step * nlat, lon0], [lat_top, lon0 + step * nlon]],
        "image": "data/bathy.png",
        "stops": [[d, "rgb(%d,%d,%d)" % c] for d, c in STOPS],
        "grid": grid,
        "contours": feats,
    }
    with open("data/bathy.js", "w", encoding="utf-8") as f:
        f.write("// 唐津周辺の海底地形(GEBCO 2024 から tools/build_bathy.py で作成。手で編集しない)\n")
        f.write("window.UMI_BATHY = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print("書き出し: data/bathy.js, data/bathy.png")


if __name__ == "__main__":
    main()
