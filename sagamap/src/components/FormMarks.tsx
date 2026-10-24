"use client";

import { AlertTriangle } from "lucide-react";
import { useT } from "@/components/LangProvider";

/** 入力欄の「必須」の目印（ラベルの後ろに付ける） */
export function Req() {
  const t = useT();
  return (
    <span
      className="ml-1.5 inline-block rounded bg-coral-500 px-1.5 py-px align-[1px] text-[11px] font-bold leading-4 text-white"
      aria-label={t("必須")}
    >
      {t("必須")}
    </span>
  );
}

/** 入力欄の「任意」の目印 */
export function Opt() {
  const t = useT();
  return (
    <span className="ml-1.5 inline-block rounded bg-slate-200 px-1.5 py-px align-[1px] text-[11px] font-bold leading-4 text-slate-600">
      {t("任意")}
    </span>
  );
}

/** 登録フォームの上に置く注意文（無料のサービスのため、いたずら登録を防ぐ） */
export function RegisterNotice({ business = false }: { business?: boolean }) {
  const t = useT();
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-coral-100 bg-coral-50 px-3 py-2 text-xs leading-5 text-coral-700"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <b>
          <Req />
          {t("の項目は必ず正しい情報を入力してください。")}
        </b>
        {business
          ? "無料でご利用いただけるサービスのため、いたずら・なりすまし防止に実在するお店の情報で登録してください。事実と異なる登録は、予告なく掲載停止・削除することがあります。"
          : t("無料でご利用いただけるサービスのため、いたずら防止にご協力ください。事実と異なる登録や不正な利用は、予告なく利用停止・削除することがあります。")}
      </span>
    </p>
  );
}
