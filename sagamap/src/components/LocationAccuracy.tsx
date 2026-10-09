/** 現在地の精度の案内 */
export default function LocationAccuracy({ status, accuracy }: { status: string; accuracy: number | null }) {
  if (status === "locating" && accuracy === null) {
    return <p className="text-xs font-bold text-saga-600">📡 現在地を測定しています…</p>;
  }
  if (status !== "ok" && status !== "locating") return null;
  if (accuracy === null || accuracy <= 50) return null;
  return (
    <p className="rounded-2xl bg-saga-50 px-4 py-2 text-xs font-bold text-saga-700">
      📡 現在地の誤差は約 {accuracy.toLocaleString()}m です
      {status === "locating" ? "（精度を上げています…）" : ""}。
      屋外に出る、Wi-Fi をオンにする、端末の「正確な位置情報」をオンにすると精度が上がります。
    </p>
  );
}
