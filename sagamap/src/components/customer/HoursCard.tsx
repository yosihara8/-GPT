"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import MonthCalendar from "@/components/MonthCalendar";
import { WEEK_ORDER, WEEKDAYS, addDays, dayHours, isWeekly, jstParts, rangesText, type SpecialDay } from "@/lib/schedule";
import { useT } from "@/components/LangProvider";

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8))}（${WEEKDAYS[new Date(`${ymd}T00:00:00Z`).getUTCDay()]}）`;

/** お店のページの「営業時間・カレンダー」 */
export default function HoursCard({
  weeklyHours,
  specials = [],
  note,
  hoursText,
  closedText,
}: {
  weeklyHours?: unknown;
  specials?: SpecialDay[] | null;
  note?: string | null;
  hoursText?: string | null;
  closedText?: string | null;
}) {
  const weekly = isWeekly(weeklyHours) ? weeklyHours : null;
  const sp = specials ?? [];
  const { ymd: today, dow } = jstParts();
  const [open, setOpen] = useState(false);
  const t = useT();
  const [picked, setPicked] = useState<string | null>(null);
  const upcoming = sp.filter((d) => d.day >= today && d.day <= addDays(today, 30)).slice(0, 4);

  if (!weekly && !hoursText && !closedText && sp.length === 0) return null;

  const todayH = dayHours(today, weekly, sp);
  const pickedH = picked ? dayHours(picked, weekly, sp) : null;

  return (
    <section className="mx-4 mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200/70">
      <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
        <Clock className="h-4 w-4 text-saga-600" aria-hidden />
        {t("営業時間")}
      </h2>

      {todayH && (
        <p className={`mt-3 rounded-2xl px-3 py-2.5 text-[15px] font-bold ${todayH.closed ? "bg-coral-50 text-coral-700" : "bg-tea-50 text-tea-700"}`}>
          {t("本日")} {md(today)}　{todayH.closed ? t(todayH.special ? "臨時休業" : "定休日") : rangesText(todayH.ranges)}
          {todayH.note && <span className="ml-1 text-xs font-normal">（{todayH.note}）</span>}
        </p>
      )}

      {weekly ? (
        <table className="mt-3 w-full text-[15px]">
          <tbody>
            {WEEK_ORDER.map((d) => (
              <tr key={d} className={d === dow ? "font-bold text-saga-700" : ""}>
                <th scope="row" className={`w-10 py-1 text-left font-bold ${d === 0 ? "text-coral-500" : d === 6 ? "text-saga-600" : ""}`}>
                  {WEEKDAYS[d]}
                </th>
                <td className={`num py-1 ${weekly[d].length === 0 ? "text-slate-400" : ""}`}>{weekly[d].length ? rangesText(weekly[d]) : t("定休日")}</td>
                <td className="w-10 text-right text-[11px]">{d === dow && <span className="rounded-full bg-asa-500 px-1.5 py-0.5 text-white">{t("今日")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-3 text-[15px]">
          {hoursText && <p>{hoursText}</p>}
          {closedText && <p className="text-slate-500">{t("定休日：")}{closedText}</p>}
        </div>
      )}
      {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}

      {upcoming.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl bg-sun-100/60 p-3 text-sm">
          <li className="text-xs font-bold text-sun-500">{t("お休み・営業時間が変わる日")}</li>
          {upcoming.map((d) => (
            <li key={d.day}>
              <span className="num font-bold">{md(d.day)}</span>　{d.closed ? t("臨時休業") : `${t("特別営業")} ${rangesText(d.ranges ?? [])}`}
              {d.note && <span className="text-slate-500">（{d.note}）</span>}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-saga-700"
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        {t("営業カレンダーを見る")}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="mt-3">
          <MonthCalendar weekly={weekly} specials={sp} selected={picked} onSelect={setPicked} />
          {picked && (
            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="num font-bold">{md(picked)}</span>
              {pickedH ? (pickedH.closed ? t(pickedH.special ? "臨時休業" : "定休日") : rangesText(pickedH.ranges)) : t("お店にお問い合わせください")}
              {pickedH?.note && <span className="text-slate-500">（{pickedH.note}）</span>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
