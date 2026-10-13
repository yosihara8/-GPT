"use client";

import { useState } from "react";
import { CalendarDays, Copy, Plus, X } from "lucide-react";
import MonthCalendar from "@/components/MonthCalendar";
import { api } from "@/lib/fetcher";
import {
  WEEK_ORDER,
  WEEKDAYS,
  dayHours,
  isWeekly,
  rangesText,
  weeklyFromText,
  type Range,
  type SpecialDay,
  type Weekly,
} from "@/lib/schedule";

type Props = {
  storeId: number;
  weeklyHours?: unknown;
  hoursNote?: string | null;
  specials?: SpecialDay[] | null;
  businessHours?: string | null;
  closedDays?: string | null;
  onSaved: () => void;
};

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}月${Number(ymd.slice(8))}日（${WEEKDAYS[new Date(`${ymd}T00:00:00Z`).getUTCDay()]}）`;

/**
 * 営業カレンダーの設定（事業主）。
 * ① 曜日ごとの営業時間・定休日（昼・夜の 2 部制も可）② カレンダーで臨時休業・特別営業の日を登録
 */
export default function ScheduleEditor({ storeId, weeklyHours, hoursNote, specials, businessHours, closedDays, onSaved }: Props) {
  const initial = isWeekly(weeklyHours) ? weeklyHours : weeklyFromText(businessHours, closedDays);
  const [weekly, setWeekly] = useState<Weekly>(initial);
  const [lastOpen, setLastOpen] = useState<Range[][]>(initial.map((d) => (d.length ? d : [["11:00", "20:00"]])));
  const [note, setNote] = useState(hoursNote ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState<SpecialDay[]>(specials ?? []);
  const [picked, setPicked] = useState<string | null>(null);

  const setDay = (d: number, rs: Range[]) => setWeekly((w) => w.map((x, i) => (i === d ? rs : x)));
  const setTime = (d: number, ri: number, side: 0 | 1, v: string) =>
    setDay(
      d,
      weekly[d].map((r, i) => (i === ri ? ((side === 0 ? [v, r[1]] : [r[0], v]) as Range) : r)),
    );
  const toggleOpen = (d: number) => {
    if (weekly[d].length) {
      setLastOpen((l) => l.map((x, i) => (i === d ? weekly[d] : x)));
      setDay(d, []);
    } else setDay(d, lastOpen[d]);
  };
  const copyMonday = () => setWeekly((w) => w.map((x) => (x.length ? w[1].map((r) => [...r] as Range) : x)));

  async function saveWeekly() {
    setSaving(true);
    setMsg(null);
    try {
      const filled = weekly.map((rs) => rs.filter((r) => r[0] && r[1]));
      await api(`/api/businesses/${storeId}/schedule`, { method: "PUT", body: JSON.stringify({ weekly: filled, note }) });
      setMsg("保存しました。お客さまのお店のページの「営業中」表示とカレンダーに反映されます。");
      onSaved();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="flex items-center gap-1.5 font-bold">
          <CalendarDays className="h-4 w-4 text-saga-600" aria-hidden />
          営業カレンダー
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          曜日ごとの営業時間と定休日、臨時休業・特別営業の日を設定できます。お客さまの地図に「営業中」「本日臨時休業」などが自動で表示されます。
        </p>
      </div>

      {/* ① 曜日ごとの営業時間 */}
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="whitespace-nowrap text-sm font-bold">① いつもの営業時間</p>
          <button type="button" onClick={copyMonday} className="flex items-center gap-1 text-xs font-bold text-saga-700">
            <Copy className="h-3.5 w-3.5" aria-hidden />
            月曜の時間を全部にコピー
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {WEEK_ORDER.map((d) => {
            const rs = weekly[d];
            const openDay = rs.length > 0;
            return (
              <li key={d} className="flex flex-wrap items-center gap-2 py-2">
                <span className={`w-6 text-center font-bold ${d === 0 ? "text-coral-500" : d === 6 ? "text-saga-600" : ""}`}>{WEEKDAYS[d]}</span>
                <button
                  type="button"
                  onClick={() => toggleOpen(d)}
                  aria-pressed={openDay}
                  aria-label={`${WEEKDAYS[d]}曜日を${openDay ? "定休日にする" : "営業日にする"}`}
                  className={`w-[4.5rem] rounded-full px-2 py-1 text-xs font-bold ${openDay ? "bg-saga-600 text-white" : "bg-slate-200 text-slate-600"}`}
                >
                  {openDay ? "営業" : "定休日"}
                </button>
                {openDay && (
                  <div className="flex flex-1 flex-col gap-1.5">
                    {rs.map((r, ri) => (
                      <div key={ri} className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={r[0]}
                          onChange={(e) => setTime(d, ri, 0, e.target.value)}
                          aria-label={`${WEEKDAYS[d]}曜 開店時刻`}
                          className="input w-[7.2rem] px-2 py-1.5"
                        />
                        <span className="text-slate-400">〜</span>
                        <input
                          type="time"
                          value={r[1]}
                          onChange={(e) => setTime(d, ri, 1, e.target.value)}
                          aria-label={`${WEEKDAYS[d]}曜 閉店時刻`}
                          className="input w-[7.2rem] px-2 py-1.5"
                        />
                        {ri === 1 && (
                          <button type="button" aria-label="2 つ目の時間を消す" onClick={() => setDay(d, [rs[0]])} className="p-1 text-slate-400">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {rs.length === 1 && (
                      <button
                        type="button"
                        onClick={() => setDay(d, [[rs[0][0], "14:00"], ["17:00", rs[0][1]]])}
                        className="flex w-fit items-center gap-1 text-xs font-bold text-saga-700"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        昼休みを入れる（2 部制）
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-1 text-xs text-slate-500">深夜まで営業するときは、閉店を翌朝の時刻（例 18:00〜2:00）にしてください。</p>
        <label className="label mt-3">補足（任意）</label>
        <input
          className="input"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="例：ラストオーダーは閉店 30 分前／祝日は営業します"
        />
        {msg && <p className="mt-2 text-sm text-saga-700">{msg}</p>}
        <button type="button" disabled={saving} onClick={saveWeekly} className="btn-primary mt-3">
          {saving ? "保存中…" : "営業時間を保存する"}
        </button>
      </div>

      {/* ② 臨時休業・特別営業 */}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="text-sm font-bold">② 臨時休業・特別営業の日</p>
        <p className="mb-3 mt-0.5 text-xs text-slate-500">日付をタップして、お休みや営業時間が変わる日を登録します（約 1 年先まで）。</p>
        <MonthCalendar weekly={weekly} specials={days} selected={picked} onSelect={setPicked} maxMonths={12} />
        {picked && (
          <DayPanel
            key={picked}
            storeId={storeId}
            ymd={picked}
            current={days.find((x) => x.day === picked) ?? null}
            usual={dayHours(picked, weekly, [])}
            onChange={(next) => {
              setDays((xs) => [...xs.filter((x) => x.day !== picked), ...(next ? [next] : [])].sort((a, b) => a.day.localeCompare(b.day)));
              onSaved();
            }}
            onClose={() => setPicked(null)}
          />
        )}
        {days.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            <li className="text-xs font-bold text-slate-500">登録済みの日</li>
            {days.map((x) => (
              <li key={x.day}>
                <button type="button" onClick={() => setPicked(x.day)} className="text-left underline-offset-2 hover:underline">
                  <span className="num font-bold">{md(x.day)}</span>　{x.closed ? "臨時休業" : `特別営業 ${rangesText(x.ranges ?? [])}`}
                  {x.note && <span className="text-slate-500">（{x.note}）</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function DayPanel({
  storeId,
  ymd,
  current,
  usual,
  onChange,
  onClose,
}: {
  storeId: number;
  ymd: string;
  current: SpecialDay | null;
  usual: ReturnType<typeof dayHours>;
  onChange: (d: SpecialDay | null) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"closed" | "special">(current && !current.closed ? "special" : "closed");
  const [range, setRange] = useState<Range>(current?.ranges?.[0] ?? usual?.ranges[0] ?? ["11:00", "20:00"]);
  const [note, setNote] = useState(current?.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const body = { day: ymd, closed: mode === "closed", ranges: mode === "special" ? [range] : undefined, note };
      await api(`/api/businesses/${storeId}/schedule`, { method: "POST", body: JSON.stringify(body) });
      onChange({ day: ymd, closed: body.closed, ranges: body.ranges ?? null, note });
      setMsg("登録しました");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      await api(`/api/businesses/${storeId}/schedule?day=${ymd}`, { method: "DELETE" });
      onChange(null);
      onClose();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">{md(ymd)}</p>
          <p className="text-xs text-slate-500">いつもは {usual ? (usual.closed ? "定休日" : rangesText(usual.ranges)) : "未設定"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="閉じる" className="p-1 text-slate-400">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMode("closed")} className={mode === "closed" ? "chip-on justify-center" : "chip-off justify-center"}>
          臨時休業にする
        </button>
        <button type="button" onClick={() => setMode("special")} className={mode === "special" ? "chip-on justify-center" : "chip-off justify-center"}>
          営業時間を変える
        </button>
      </div>
      {mode === "special" && (
        <div className="flex items-center gap-1.5">
          <input type="time" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} aria-label="開店時刻" className="input w-[7.2rem] px-2 py-1.5" />
          <span className="text-slate-400">〜</span>
          <input type="time" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} aria-label="閉店時刻" className="input w-[7.2rem] px-2 py-1.5" />
        </div>
      )}
      <input
        className="input"
        maxLength={60}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={mode === "closed" ? "理由（任意）例：店内改装のため" : "ひとこと（任意）例：夏祭りのため延長"}
      />
      {msg && <p className="text-sm text-saga-700">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={save} className="btn-primary">
          この日を登録する
        </button>
        {current && (
          <button type="button" disabled={busy} onClick={reset} className="btn-outline">
            通常どおりに戻す
          </button>
        )}
      </div>
    </div>
  );
}
