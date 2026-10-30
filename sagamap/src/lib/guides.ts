/**
 * 検索エンジン向けの「お店さがし」ページ（/guide/...）の定義。
 * 「佐賀 カフェ」「佐賀 ランチ」などで探す人に、掲載店の一覧を見せる入口。説明文は自前。
 */
export type Guide = {
  slug: string;
  /** ジャンルのページ（業種 1 つ） */
  category?: string;
  /** よく検索される言葉のページ：業種（複数）・町（住所に含む）・言葉（名前・紹介文・メニューに含む）でしぼる */
  categories?: string[];
  towns?: string[];
  words?: string[];
  title: string;
  lead: string;
  intro: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "lunch",
    category: "飲食",
    title: "佐賀のランチ",
    lead: "佐賀のランチ・食事ができるお店",
    intro:
      "佐賀牛やシシリアンライス、呼子のいか、嬉野の温泉湯どうふなど、佐賀には地元ならではの味がたくさんあります。佐賀観光マップに載っている、ランチや食事が楽しめるお店をエリアごとにご紹介します。",
  },
  {
    slug: "cafe",
    category: "カフェ",
    title: "佐賀のカフェ",
    lead: "佐賀のカフェ・喫茶店",
    intro:
      "城下町の佐賀市、焼き物の町の有田・伊万里、温泉地の武雄・嬉野。佐賀には、町の雰囲気に合わせたすてきなカフェがあります。嬉野茶や有田焼の器で楽しめるお店も。ひと休みにぴったりのカフェをご紹介します。",
  },
  {
    slug: "sweets",
    category: "スイーツ",
    title: "佐賀のスイーツ・和菓子",
    lead: "佐賀のスイーツ・和菓子のお店",
    intro: "丸ぼうろや小城羊羹など、佐賀は昔から甘いものの文化が根づく土地です。おみやげにも、食べ歩きにもおすすめのスイーツ・和菓子のお店をご紹介します。",
  },
  {
    slug: "bar",
    category: "バー",
    title: "佐賀のバー・居酒屋",
    lead: "佐賀で夜に楽しめるお店",
    intro: "佐賀は酒蔵の多い酒どころ。地酒やクラフトビール、佐賀の食材の料理と一緒に、夜の時間を楽しめるお店をご紹介します。",
  },
  {
    slug: "shopping",
    category: "雑貨",
    title: "佐賀の雑貨",
    lead: "佐賀の雑貨店・セレクトショップ",
    intro: "旅の思い出に、佐賀らしい雑貨を。地元の作り手の品や、贈りものにぴったりの品が見つかるお店をご紹介します。",
  },
  {
    slug: "craft",
    category: "アート・工芸",
    title: "佐賀の焼き物・工芸",
    lead: "有田焼・伊万里焼・唐津焼などの工芸のお店",
    intro: "有田焼・伊万里焼・唐津焼など、佐賀は日本を代表する焼き物の産地です。窯元やギャラリー、器のお店など、ものづくりにふれられる場所をご紹介します。",
  },
  {
    slug: "stay",
    category: "宿泊",
    title: "佐賀の宿・温泉",
    lead: "佐賀の旅館・ホテル・温泉宿",
    intro: "嬉野温泉・武雄温泉・古湯温泉など、佐賀には名湯がそろっています。旅の拠点になる旅館・ホテル・温泉宿をご紹介します。",
  },
  {
    slug: "activity",
    category: "体験・アクティビティ",
    title: "佐賀の体験・アクティビティ",
    lead: "佐賀で楽しめる体験",
    intro: "焼き物づくりやお茶の体験、酒蔵めぐり、海や山のアクティビティなど、佐賀で旅の思い出をつくれる体験をご紹介します。",
  },
  {
    slug: "beauty",
    category: "美容・健康",
    title: "佐賀の美容・リラクゼーション",
    lead: "佐賀の美容・健康のお店",
    intro: "「美肌の湯」で知られる嬉野温泉をはじめ、旅の疲れをいやせる美容・リラクゼーションのお店をご紹介します。",
  },
];

const FOOD = ["飲食", "カフェ", "スイーツ", "バー"];

/**
 * 佐賀観光でよく検索される言葉（2026-10 調べ。ラッコキーワード等のサジェスト・旅行サイトの人気ランキング・
 * Google 検索ランキング・「佐賀県といえば」調査から。上位 10 語のうち、ジャンルのページに無いもの）。
 * 「佐賀 観光」はトップ・お店さがし、「佐賀 ランチ」「佐賀 カフェ」はジャンルのページで受ける。
 */
export const THEMES: Guide[] = [
  {
    slug: "gourmet",
    categories: FOOD,
    title: "佐賀のグルメ・名物",
    lead: "佐賀グルメが味わえるお店",
    intro:
      "佐賀グルメといえば、佐賀牛、呼子のいかの活き造り、シシリアンライス、嬉野の温泉湯どうふ、竹崎かに、有明海のムツゴロウや海苔。お茶や地酒、丸ぼうろなどの甘いものも名物です。佐賀観光マップに載っている、佐賀の味を楽しめるお店をまとめてご紹介します。",
  },
  {
    slug: "sagagyu",
    categories: FOOD,
    words: ["佐賀牛"],
    title: "佐賀牛が食べられるお店",
    lead: "佐賀牛のステーキ・焼肉・ハンバーグなど",
    intro:
      "佐賀牛は、きめ細かな霜降りとやわらかさで知られる佐賀のブランド牛です。ステーキや焼肉、しゃぶしゃぶはもちろん、ハンバーグや佐賀牛のランチなど気軽に味わえるお店も。紹介文やメニューに「佐賀牛」とあるお店をご紹介します。",
  },
  {
    slug: "karatsu-yobuko",
    categories: FOOD,
    towns: ["唐津市", "玄海町"],
    title: "唐津・呼子のグルメ（呼子のいか）",
    lead: "唐津・呼子・玄海で食事ができるお店",
    intro:
      "透きとおった「呼子のいか」の活き造りは、佐賀観光でいちばん人気のグルメのひとつ。呼子の朝市、唐津城や虹の松原、からつバーガーなど、唐津・呼子・玄海は海の幸と見どころが集まるエリアです。唐津観光のついでに寄れるお店をご紹介します。",
  },
  {
    slug: "ureshino",
    towns: ["嬉野市"],
    title: "嬉野温泉のお店・宿",
    lead: "嬉野温泉の宿・グルメ・カフェ・おみやげ",
    intro:
      "嬉野温泉は「日本三大美肌の湯」のひとつに数えられる、とろりとしたお湯が自慢の温泉地です。名物の温泉湯どうふ、うれしの茶、肥前吉田焼も楽しめます。嬉野温泉の宿や、食事・カフェ・おみやげのお店をご紹介します。",
  },
  {
    slug: "takeo",
    towns: ["武雄市"],
    title: "武雄温泉のお店・宿",
    lead: "武雄温泉の宿・グルメ・カフェ・体験",
    intro:
      "朱色の楼門がシンボルの武雄温泉は、1300 年の歴史がある温泉地。御船山楽園や武雄市図書館、樹齢 3000 年の武雄の大楠など、見どころもたくさんあります。武雄温泉の宿や、食事・カフェのお店をご紹介します。",
  },
  {
    slug: "arita",
    towns: ["有田町", "伊万里市"],
    title: "有田焼・伊万里焼のお店（有田・伊万里）",
    lead: "有田・伊万里の窯元・器のお店・グルメ",
    intro:
      "有田焼は日本で初めて磁器が焼かれた、400 年の歴史をもつ焼き物です。毎年春の有田陶器市には全国から多くの人が訪れます。秘窯の里・大川内山の伊万里焼、伊万里牛も人気。有田・伊万里の窯元や器のお店、食事のお店をご紹介します。",
  },
  {
    slug: "souvenir",
    categories: ["スイーツ", "雑貨", "アート・工芸"],
    title: "佐賀のお土産・おみやげ",
    lead: "佐賀のお土産が買えるお店",
    intro:
      "佐賀のお土産の定番は、丸ぼうろ、小城羊羹、うれしの茶、有田焼の器、佐賀海苔、佐賀の地酒など。旅の思い出や、家族・職場への手みやげにぴったりの品が見つかるお店をご紹介します。",
  },
];

/** エリアの URL 名（/guide/cafe/nanbu など） */
export const AREA_SLUGS: Record<string, { slug: string; label: string }> = {
  nw: { slug: "hokuseibu", label: "唐津・玄海" },
  w: { slug: "seibu", label: "伊万里・有田" },
  c: { slug: "chubu", label: "佐賀・小城・多久" },
  e: { slug: "tobu", label: "鳥栖・神埼・吉野ヶ里" },
  s: { slug: "nanbu", label: "武雄・嬉野・鹿島" },
};

export const guideOf = (slug: string) => [...GUIDES, ...THEMES].find((g) => g.slug === slug);
/** よく検索される言葉のページか（エリアでのしぼり込みページは作らない） */
export const isTheme = (g: Guide) => !g.category;
/** そのページに載せるお店をしぼる条件 */
export const guideFilter = (g: Guide) => ({ categories: g.categories ?? (g.category ? [g.category] : null), towns: g.towns ?? null, words: g.words ?? null });
export const guideOfCategory = (category: string) => GUIDES.find((g) => g.category === category);
export const areaKeyOfSlug = (slug: string) => Object.entries(AREA_SLUGS).find(([, v]) => v.slug === slug)?.[0];

/** 英語の表示（題・ひとこと・説明） */
export const GUIDE_EN: Record<string, { title: string; lead: string; intro: string }> = {
  lunch: {
    title: "Lunch in Saga",
    lead: "Places for lunch and dinner in Saga",
    intro: "Saga beef, Sicilian Rice, Yobuko squid, Ureshino’s hot-spring tofu — Saga is full of local flavors. Here are the restaurants on Saga Kanko Map, by area.",
  },
  cafe: {
    title: "Cafés in Saga",
    lead: "Cafés and coffee shops in Saga",
    intro: "From the castle town of Saga to the pottery towns of Arita and Imari and the hot-spring towns of Takeo and Ureshino, Saga has lovely cafés that match each town’s mood — some serve Ureshino tea or use Arita ware. Find a place to take a break.",
  },
  sweets: {
    title: "Sweets & Japanese Confectionery in Saga",
    lead: "Sweets shops in Saga",
    intro: "From marubouro to Ogi yokan, Saga has a long tradition of sweets. Great for souvenirs or snacking as you stroll.",
  },
  bar: {
    title: "Bars & Izakaya in Saga",
    lead: "Places to enjoy the evening in Saga",
    intro: "Saga is a sake region with many breweries. Enjoy local sake, craft beer and dishes made with Saga ingredients.",
  },
  shopping: {
    title: "Gift Shops in Saga",
    lead: "Gift and select shops in Saga",
    intro: "Find Saga-made goods and gifts from local makers — perfect mementos of your trip.",
  },
  craft: {
    title: "Pottery & Crafts in Saga",
    lead: "Arita, Imari and Karatsu ware",
    intro: "Saga is one of Japan’s great pottery regions — Arita ware, Imari ware and Karatsu ware. Visit kilns, galleries and tableware shops.",
  },
  stay: {
    title: "Hotels & Hot Springs in Saga",
    lead: "Ryokan, hotels and onsen inns in Saga",
    intro: "Saga has famous hot springs such as Ureshino, Takeo and Furuyu. Find a ryokan or hotel as your base.",
  },
  activity: {
    title: "Experiences & Activities in Saga",
    lead: "Things to do in Saga",
    intro: "Pottery making, tea experiences, sake brewery tours, and outdoor activities by the sea and mountains — make memories in Saga.",
  },
  beauty: {
    title: "Beauty & Relaxation in Saga",
    lead: "Beauty and wellness in Saga",
    intro: "Starting with Ureshino, known for its “skin-beautifying” hot springs, relax and recharge at Saga’s beauty and wellness spots.",
  },
};

Object.assign(GUIDE_EN, {
  gourmet: {
    title: "Saga Gourmet & Local Specialties",
    lead: "Places to taste Saga’s local food",
    intro: "Saga beef, live squid sashimi from Yobuko, Sicilian Rice, Ureshino’s hot-spring tofu, Takezaki crab, Ariake seaweed — plus tea, local sake and marubouro sweets. Here are the places on Saga Kanko Map where you can taste Saga.",
  },
  sagagyu: {
    title: "Where to Eat Saga Beef",
    lead: "Saga beef steak, yakiniku, hamburg and more",
    intro: "Saga beef is Saga’s famous wagyu, known for its fine marbling and tenderness. Enjoy it as steak, yakiniku or shabu-shabu — or casually as a hamburg steak or lunch set. These are shops that mention Saga beef in their description or menu.",
  },
  "karatsu-yobuko": {
    title: "Karatsu & Yobuko Food (Yobuko Squid)",
    lead: "Places to eat in Karatsu, Yobuko and Genkai",
    intro: "Translucent live squid sashimi from Yobuko is one of Saga’s most popular dishes. With the Yobuko morning market, Karatsu Castle, the Nijinomatsubara pine grove and the Karatsu Burger, this area is full of seafood and sights.",
  },
  ureshino: {
    title: "Ureshino Onsen — Shops & Inns",
    lead: "Inns, food, cafés and souvenirs in Ureshino",
    intro: "Ureshino Onsen is counted among Japan’s three great “skin-beautifying” hot springs. Try the famous hot-spring tofu, Ureshino tea and Hizen Yoshida ware. Here are inns and shops in Ureshino.",
  },
  takeo: {
    title: "Takeo Onsen — Shops & Inns",
    lead: "Inns, food, cafés and experiences in Takeo",
    intro: "Takeo Onsen, with its vermilion gate, has 1,300 years of history. Mifuneyama Rakuen, the Takeo City Library and the 3,000-year-old giant camphor tree are nearby. Here are inns and shops in Takeo.",
  },
  arita: {
    title: "Arita & Imari Pottery Shops",
    lead: "Kilns, tableware shops and food in Arita and Imari",
    intro: "Arita ware is Japan’s first porcelain, with 400 years of history; the Arita Ceramic Fair draws crowds every spring. Okawachiyama’s Imari ware and Imari beef are popular too. Here are kilns, tableware shops and restaurants in Arita and Imari.",
  },
  souvenir: {
    title: "Souvenirs from Saga",
    lead: "Where to buy Saga souvenirs",
    intro: "Classic Saga souvenirs include marubouro, Ogi yokan, Ureshino tea, Arita ware, Saga seaweed and local sake. Find gifts for family and friends here.",
  },
});

export const AREA_LABEL_EN: Record<string, string> = {
  nw: "Karatsu · Genkai",
  w: "Imari · Arita",
  c: "Saga · Ogi · Taku",
  e: "Tosu · Kanzaki · Yoshinogari",
  s: "Takeo · Ureshino · Kashima",
};
