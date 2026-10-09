import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateRoute, nearestNeighborOrder, planRoute } from "@/lib/routing";

afterEach(() => vi.unstubAllGlobals());

const station = { lat: 33.2643, lng: 130.297 };
const castle = { lat: 33.247, lng: 130.3005 };
const near = { lat: 33.2638, lng: 130.2985 };

describe("nearestNeighborOrder / estimateRoute", () => {
  it("出発地から近い順に並べる", () => {
    expect(nearestNeighborOrder([station, castle, near])).toEqual([0, 2, 1]);
  });
  it("直線の概算ルートは estimated", () => {
    const r = estimateRoute([station, castle], "foot");
    expect(r.estimated).toBe(true);
    expect(r.legs).toHaveLength(1);
    expect(r.duration).toBeGreaterThan(0);
  });
});

describe("planRoute", () => {
  it("OSRM の trip で順番を決め、route の道に沿った線を返す", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/trip/")) {
        // 入力順 [station, castle, near] → 巡る順 station(0) → near(1) → castle(2)
        return new Response(JSON.stringify({ code: "Ok", waypoints: [{ waypoint_index: 0 }, { waypoint_index: 2 }, { waypoint_index: 1 }] }));
      }
      return new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 2500,
              duration: 1900,
              legs: [{ distance: 200, duration: 150 }, { distance: 2300, duration: 1750 }],
              geometry: { coordinates: [[130.297, 33.2643], [130.298, 33.26], [130.3005, 33.247]] },
            },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await planRoute([station, castle, near], "foot");
    expect(r.estimated).toBe(false);
    expect(r.order).toEqual([0, 2, 1]);
    expect(r.geometry[0]).toEqual([33.2643, 130.297]);
    expect(r.legs).toHaveLength(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("routing.openstreetmap.de/routed-foot/trip");
  });

  it("道案内サーバーにつながらなければ直線の概算に切り替える", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const r = await planRoute([station, castle], "car");
    expect(r.estimated).toBe(true);
    expect(r.mode).toBe("car");
  });
});
