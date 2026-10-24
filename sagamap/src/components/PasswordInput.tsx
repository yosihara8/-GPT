"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/components/LangProvider";

/** パスワードの入力欄（右の「表示」で入れた文字を確認できる。打ち間違い防止） */
const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput(
  { className = "input", ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  const t = useT();
  return (
    <div className="relative">
      <input ref={ref} {...props} type={show ? "text" : "password"} className={`${className} pr-[4.75rem]`} autoCapitalize="none" spellCheck={false} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={show ? t("パスワードを隠す") : t("パスワードを表示する")}
        className="absolute inset-y-0 right-1.5 my-auto flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-saga-700 hover:bg-slate-100"
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        {show ? t("隠す") : t("表示")}
      </button>
    </div>
  );
});

export default PasswordInput;
