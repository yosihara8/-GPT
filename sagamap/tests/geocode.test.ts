import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeAddress, normalizeAddress } from "@/lib/geocode";

afterEach(() => vi.unstubAllGlobals());

describe("normalizeAddress", () => {
  it("全角数字・ハイフン・空白をそろえる", () => {
    expect(normalizeAddress("佐賀県佐賀市　駅前中央１丁目４－１７")).toBe("佐賀県佐賀市駅前中央1丁目4-17");
  });
});

describe("geocodeAddress", () => {
  it("国土地理院の結果から緯度経度と一致した住所を返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { geometry: { coordinates: [130.2985, 33.2638], type: "Point" }, properties: { title: "佐賀県佐賀市駅前中央一丁目" } },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = await geocodeAddress("佐賀県佐賀市駅前中央１丁目");
    expect(r).toEqual({ lat: 33.2638, lng: 130.2985, matched: "佐賀県佐賀市駅前中央一丁目" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("msearch.gsi.go.jp");
  });

  it("見つからない・通信失敗なら null（住所の入力し直しを促す）", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]")));
    expect(await geocodeAddress("存在しない住所")).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await geocodeAddress("佐賀県")).toBeNull();
    expect(await geocodeAddress("   ")).toBeNull();
  });

  it("日本の範囲外の結果は採用しない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([{ geometry: { coordinates: [0, 0] }, properties: { title: "x" } }]))),
    );
    expect(await geocodeAddress("どこか")).toBeNull();
  });
});
