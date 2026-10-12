"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** パスワードの入力欄（右の「表示」で入れた文字を確認できる。打ち間違い防止） */
const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput(
  { className = "input", ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} {...props} type={show ? "text" : "password"} className={`${className} pr-[4.75rem]`} autoCapitalize="none" spellCheck={false} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={show ? "パスワードを隠す" : "パスワードを表示する"}
        className="absolute inset-y-0 right-1.5 my-auto flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-saga-700 hover:bg-slate-100"
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        {show ? "隠す" : "表示"}
      </button>
    </div>
  );
});

export default PasswordInput;
