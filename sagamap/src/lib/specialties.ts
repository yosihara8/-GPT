/** 佐賀の名物（地域ごと）。説明は自前の短い紹介 */
export type Specialty = { name: string; area: string; note: string };

export const SPECIALTIES: Specialty[] = [
  { name: "呼子のいか", area: "唐津・呼子", note: "透きとおるいかの活き造り" },
  { name: "Q さば", area: "唐津", note: "唐津の養殖さば。刺身で食べられる" },
  { name: "佐賀牛", area: "佐賀", note: "きめ細かな霜降りの黒毛和牛" },
  { name: "丸ぼうろ", area: "佐賀", note: "素朴な甘さの焼き菓子" },
  { name: "シシリアンライス", area: "佐賀", note: "ご飯に肉と野菜をのせた佐賀市のご当地料理" },
  { name: "鯉こく", area: "小城", note: "清水の滝の近くで食べられる鯉のみそ汁" },
  { name: "小城羊羹", area: "小城", note: "外は砂糖でシャリッとした昔ながらの羊羹" },
  { name: "嬉野茶", area: "嬉野", note: "丸い形の香り高い緑茶" },
  { name: "温泉湯どうふ", area: "嬉野", note: "温泉の湯で煮て、とろとろになる豆腐" },
  { name: "竹崎カニ", area: "太良", note: "有明海のワタリガニ" },
  { name: "日本酒（酒蔵）", area: "鹿島・嬉野", note: "酒蔵めぐりができる酒どころ" },
  { name: "呉豆腐", area: "武雄・有田", note: "もちもちした食感の豆腐" },
  { name: "ちゃんぽん", area: "武雄・北方", note: "国道 34 号ぞいの「ちゃんぽん街道」" },
  { name: "伊万里牛", area: "伊万里", note: "伊万里で育つ黒毛和牛" },
];
