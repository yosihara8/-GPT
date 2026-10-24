/**
 * 検索エンジン向けの「お店さがし」ページ（/guide/...）の定義。
 * 「佐賀 カフェ」「佐賀 ランチ」などで探す人に、掲載店の一覧を見せる入口。説明文は自前。
 */
export type Guide = { slug: string; category: string; title: string; lead: string; intro: string };

export const GUIDES: Guide[] = [
  {
    slug: "lunch",
    category: "飲食",
    title: "佐賀のランチ・グルメ",
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
    title: "佐賀の雑貨・おみやげ",
    lead: "佐賀の雑貨店・おみやげのお店",
    intro: "旅の思い出に、佐賀らしい雑貨やおみやげを。地元の作り手の品や、贈りものにぴったりの品が見つかるお店をご紹介します。",
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

/** エリアの URL 名（/guide/cafe/nanbu など） */
export const AREA_SLUGS: Record<string, { slug: string; label: string }> = {
  nw: { slug: "hokuseibu", label: "唐津・玄海" },
  w: { slug: "seibu", label: "伊万里・有田" },
  c: { slug: "chubu", label: "佐賀・小城・多久" },
  e: { slug: "tobu", label: "鳥栖・神埼・吉野ヶ里" },
  s: { slug: "nanbu", label: "武雄・嬉野・鹿島" },
};

export const guideOf = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const guideOfCategory = (category: string) => GUIDES.find((g) => g.category === category);
export const areaKeyOfSlug = (slug: string) => Object.entries(AREA_SLUGS).find(([, v]) => v.slug === slug)?.[0];
