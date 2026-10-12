/**
 * 営業時間・定休日（事業主が自由に書いた文字）から「営業中」などを判断する。
 * 読み取れない書き方のときは null（表示しない）
 */
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export type OpenStatus = { label: string; open: boolean };

function toMin(h: string, m: string) {
  return Number(h) * 60 + Number(m);
}

export function openStatus(hours?: string | null, closedDays?: string | null, now = new Date()): OpenStatus | null {
  // 日本時間で判断する
  const jst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  const day = DAYS[jst.getDay()];
  if (closedDays && new RegExp(`${day}(曜|$|・|、|,|\\s|/)`).test(closedDays) && !/第\d/.test(closedDays)) {
    return { label: "本日定休日", open: false };
  }
  const m = hours?.replace(/[：]/g, ":").match(/(\d{1,2}):(\d{2})\s*[〜～~\-－–—]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = toMin(m[1], m[2]);
  let end = toMin(m[3], m[4]);
  const cur = jst.getHours() * 60 + jst.getMinutes();
  if (end <= start) end += 24 * 60; // 深夜まで営業
  const isOpen = (cur >= start && cur < end) || (cur + 24 * 60 >= start && cur + 24 * 60 < end);
  if (isOpen) {
    const left = (end - (cur >= start ? cur : cur + 24 * 60));
    return { label: left <= 60 ? `まもなく閉店（${m[3]}:${m[4]}まで）` : `営業中（${m[3]}:${m[4]}まで）`, open: true };
  }
  return { label: `営業時間外（${m[1]}:${m[2]}から）`, open: false };
}

/** クーポンの残り日数（7 日以内のときだけ表示用の文字を返す） */
export function daysLeft(expiresAt: string, now = new Date()) {
  const d = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86400000);
  if (d <= 0) return "本日まで";
  if (d <= 7) return `あと${d}日`;
  return null;
}
