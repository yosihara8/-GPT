/** 発信時にお客さまへ自動でお知らせするか */
export default function NotifyCheckbox() {
  return (
    <label className="flex items-start gap-2 rounded-2xl bg-saga-50 p-3 text-sm">
      <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-5 w-5 accent-saga-600" />
      <span>
        <b>📣 お客さまに自動でお知らせする</b>
        <br />
        <span className="text-xs text-slate-600">
          この業種に興味がある方・お店を見たことがある方・紹介で登録した方に、アプリ内とメールでお知らせします（1 人あたり 1 日 3 件まで）。
        </span>
      </span>
    </label>
  );
}
