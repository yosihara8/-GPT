/**
 * 営業カレンダー（曜日ごとの営業時間・臨時休業・特別営業）。
 * weekly は日曜=0〜土曜=6 の 7 要素。各要素は営業時間の組（最大 2 つ。昼・夜など）。空なら定休日。
 */
export type Range = [string, string];
export type Weekly = Range[][];
export type SpecialDay = { day: string; closed: boolean; ranges: Range[] | null; note: string };

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
/** 表示は月曜はじまり */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME = /^([01]?\d|2[0-9]):[0-5]\d$/;
export const isTime = (s: string) => TIME.test(s) && Number(s.split(":")[0]) <= 29;

export function isWeekly(v: unknown): v is Weekly {
  return (
    Array.isArray(v) &&
    v.length === 7 &&
    v.every((d) => Array.isArray(d) && d.length <= 2 && d.every((r) => Array.isArray(r) && r.length === 2 && isTime(r[0]) && isTime(r[1])))
  );
}

const toMin = (t: string) => Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]);
const fmt = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** 日本時間の日付（YYYY-MM-DD）と曜日・分 */
export function jstParts(now = new Date()) {
  const j = new Date(now.getTime() + 9 * 3600 * 1000);
  return { ymd: j.toISOString().slice(0, 10), dow: j.getUTCDay(), min: j.getUTCHours() * 60 + j.getUTCMinutes() };
}

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const dowOf = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

export const rangesText = (rs: Range[]) => rs.map(([a, b]) => `${a}〜${b}`).join(" / ");

/** その日の営業（特別な日があればそちらを優先） */
export function dayHours(ymd: string, weekly: Weekly | null, specials: SpecialDay[] = []) {
  const sp = specials.find((s) => s.day === ymd);
  if (sp) {
    if (sp.closed) return { closed: true, ranges: [] as Range[], special: true, note: sp.note };
    if (sp.ranges?.length) return { closed: false, ranges: sp.ranges, special: true, note: sp.note };
  }
  if (!weekly) return null;
  const rs = weekly[dowOf(ymd)];
  return { closed: rs.length === 0, ranges: rs, special: false, note: sp?.note ?? "" };
}

/** 営業中かどうか（カレンダーが設定されているとき） */
export function scheduleStatus(weekly: Weekly | null, specials: SpecialDay[] = [], now = new Date()) {
  const { ymd, min } = jstParts(now);
  const today = dayHours(ymd, weekly, specials);
  const yesterday = dayHours(addDays(ymd, -1), weekly, specials);
  if (!today) return null;
  // 前日の深夜営業（例 18:00〜26:00）の続き
  for (const [a, b] of yesterday?.ranges ?? []) {
    const s = toMin(a);
    let e = toMin(b);
    if (e <= s) e += 1440;
    if (e > 1440 && min < e - 1440) return openLabel(e - 1440 - min, fmt(e));
  }
  if (today.closed) return { label: today.special ? "本日臨時休業" : "本日定休日", open: false };
  for (const [a, b] of today.ranges) {
    const s = toMin(a);
    let e = toMin(b);
    if (e <= s) e += 1440;
    if (min >= s && min < e) return openLabel(e - min, fmt(e));
  }
  const next = today.ranges.map(([a]) => toMin(a)).filter((s) => s > min).sort((x, y) => x - y)[0];
  if (next !== undefined) return { label: `営業時間外（${fmt(next)}から）`, open: false };
  return { label: "本日の営業は終了", open: false };
}

function openLabel(left: number, end: string) {
  return { label: left <= 60 ? `まもなく閉店（${end}まで）` : `営業中（${end}まで）`, open: true };
}

/** 曜日ごとの営業時間を短い文字にまとめる（メール・旧画面・検索用に保存する） */
export function summarizeWeekly(weekly: Weekly) {
  const groups: { days: number[]; text: string }[] = [];
  for (const d of WEEK_ORDER) {
    if (weekly[d].length === 0) continue;
    const text = rangesText(weekly[d]);
    const last = groups[groups.length - 1];
    if (last && last.text === text && WEEK_ORDER.indexOf(last.days[last.days.length - 1]) === WEEK_ORDER.indexOf(d) - 1) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  const label = (ds: number[]) => (ds.length >= 3 ? `${WEEKDAYS[ds[0]]}〜${WEEKDAYS[ds[ds.length - 1]]}` : ds.map((x) => WEEKDAYS[x]).join("・"));
  const hours = groups.length === 1 && groups[0].days.length + countClosed(weekly) === 7 ? groups[0].text : groups.map((g) => `${label(g.days)} ${g.text}`).join("、");
  const closed = WEEK_ORDER.filter((d) => weekly[d].length === 0).map((d) => `${WEEKDAYS[d]}曜`).join("・");
  return { hours: hours.slice(0, 100), closed: closed.slice(0, 100) };
}
const countClosed = (w: Weekly) => w.filter((d) => d.length === 0).length;

/** 以前の自由入力（「11:00〜20:00」「水曜日」）から曜日ごとの表を作る（初回の入力補助） */
export function weeklyFromText(hours?: string | null, closedDays?: string | null): Weekly {
  const m = hours?.replace(/[：]/g, ":").match(/(\d{1,2}):(\d{2})\s*[〜～~\-－–—]\s*(\d{1,2}):(\d{2})/);
  const r: Range = m ? [`${m[1].padStart(2, "0")}:${m[2]}`, `${m[3].padStart(2, "0")}:${m[4]}`] : ["11:00", "20:00"];
  return WEEKDAYS.map((d) => (closedDays && new RegExp(`${d}(曜|$|・|、|,|\\s|/)`).test(closedDays) && !/第\d/.test(closedDays) ? [] : [r]));
}

/** SQL: 臨時休業・特別営業の日（日本時間の今日を基準に from〜to 日） */
export const SPECIAL_DAYS_SQL = (b: string, from: number, to: number) =>
  `(SELECT COALESCE(json_agg(json_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'closed', d.closed, 'ranges', d.ranges, 'note', d.note) ORDER BY d.day), '[]'::json)
      FROM business_days d
     WHERE d.business_id = ${b}.id
       AND d.day BETWEEN (now() AT TIME ZONE 'Asia/Tokyo')::date + (${from}) AND (now() AT TIME ZONE 'Asia/Tokyo')::date + (${to}))`;
