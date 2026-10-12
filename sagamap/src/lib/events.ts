/** イベント特集（バルーンフェスタなど） */
export type SagaEvent = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  area: string;
  starts_on: string;
  ends_on: string;
  color: string;
  link_url: string | null;
  lat: number | null;
  lng: number | null;
  is_published?: boolean;
  coupon_count?: number;
};

/** 佐賀の主なイベントのひな形（運営者が日付を入れて公開する。日付は毎年変わるので入れない） */
export const EVENT_TEMPLATES = [
  {
    slug: "balloon",
    title: "佐賀インターナショナルバルーンフェスタ",
    subtitle: "秋の空を熱気球が彩る、アジア最大級の熱気球の大会",
    area: "佐賀市（嘉瀬川河川敷）",
    color: "#EE6A3A",
    description:
      "朝の澄んだ空に、色とりどりの熱気球がいっせいに浮かびます。期間中は会場周辺や佐賀市内のお店で使える、この期間だけのクーポンをまとめてご紹介します。会場の行き帰りに、ランチやおみやげ、カフェでのひと休みにどうぞ。",
    lat: 33.2335,
    lng: 130.2672,
  },
  {
    slug: "arita-toukiichi",
    title: "有田陶器市",
    subtitle: "有田焼の器が町じゅうに並ぶ、全国最大級の陶器市",
    area: "有田町",
    color: "#1E3A6E",
    description: "ゴールデンウィークの有田は、通りいっぱいに器のお店が並びます。器めぐりの合間に使える、この期間だけのクーポンをまとめました。",
    lat: 33.1904,
    lng: 129.8826,
  },
  {
    slug: "karatsu-kunchi",
    title: "唐津くんち",
    subtitle: "豪華な曳山が城下町をめぐる、唐津神社の秋季例大祭",
    area: "唐津市",
    color: "#C43D2B",
    description: "曳山の巡行で城下町がにぎわう 3 日間。見物の前後に寄れるお店の、この期間だけのクーポンをまとめました。",
    lat: 33.4497,
    lng: 129.9688,
  },
  {
    slug: "saga-hinamatsuri",
    title: "佐賀城下ひなまつり",
    subtitle: "城下町のあちこちに、ひな人形と鍋島緞通が飾られる春のまつり",
    area: "佐賀市（佐賀城下）",
    color: "#B9832A",
    description: "早春の佐賀城下をひな飾りめぐり。散策の途中に寄れるカフェやお食事処の、この期間だけのクーポンをまとめました。",
    lat: 33.2469,
    lng: 130.2986,
  },
] as const;

const jstToday = (now = new Date()) => new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);

/** 開催中・まもなく・終了 */
export function eventStatus(e: { starts_on: string; ends_on: string }, now = new Date()) {
  const today = jstToday(now);
  const s = e.starts_on.slice(0, 10);
  const t = e.ends_on.slice(0, 10);
  if (today > t) return { label: "終了しました", live: false, ended: true };
  if (today >= s) {
    const left = dayDiff(t, today);
    return { label: left === 0 ? "開催中・本日まで" : `開催中・あと${left + 1}日`, live: true, ended: false };
  }
  const until = dayDiff(s, today);
  return { label: until === 1 ? "あすから開催" : `あと${until}日で開催`, live: false, ended: false };
}

export const eventPeriod = (e: { starts_on: string; ends_on: string }) => {
  const f = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return `${f(e.starts_on)}〜${f(e.ends_on)}`;
};

/** SQL: イベントの列（日付は文字の YYYY-MM-DD で返す） */
export const EVENT_COLUMNS = (e = "e") =>
  `${e}.id, ${e}.slug, ${e}.title, ${e}.subtitle, ${e}.description, ${e}.area,
   to_char(${e}.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(${e}.ends_on, 'YYYY-MM-DD') AS ends_on,
   ${e}.color, ${e}.link_url, ${e}.lat, ${e}.lng, ${e}.is_published,
   (SELECT count(*) FROM coupons ec WHERE ec.event_id = ${e}.id AND ec.is_active AND ec.expires_at > now() AND ec.deleted_at IS NULL)::int AS coupon_count`;
