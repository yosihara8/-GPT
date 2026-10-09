/** 発信時にお客さまへ自動でお知らせするか */
export default function NotifyCheckbox() {
  return (
    <label className="flex items-start gap-2 rounded-2xl bg-saga-50 p-3 text-sm">
      <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-5 w-5 accent-saga-600" />
      <span>
        <b>📣 お客さまに自動でお知らせする</b>
        <br />
        <span className="text-xs text-slate-600">
          すべてのお客さまのアプリにすぐお知らせします。メールは毎週金曜日の朝に「今週の新着」としてまとめて届きます（配信停止中の方を除く）。
        </span>
      </span>
    </label>
  );
}
