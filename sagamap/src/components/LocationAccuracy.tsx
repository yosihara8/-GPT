/** 現在地の精度の案内 */
export default function LocationAccuracy({ status, accuracy }: { status: string; accuracy: number | null }) {
  if (status === "locating" && accuracy === null) {
    return <p className="text-xs font-medium text-slate-500">現在地を測定しています…</p>;
  }
  if (status !== "ok" && status !== "locating") return null;
  if (accuracy === null || accuracy <= 50) return null;
  return (
    <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
      現在地の誤差は約 {accuracy.toLocaleString()}m です
      {status === "locating" ? "（精度を上げています…）" : ""}。
      屋外に出る、Wi-Fi をオンにする、端末の「正確な位置情報」をオンにすると精度が上がります。
    </p>
  );
}
