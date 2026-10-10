/**
 * クーポン・広告の自動チェック（景品表示法・医薬品医療機器等法の観点）。
 *  - blocked: 掲載できない表現（根拠を示せない最上級表現、効能効果の断定、割引率の食い違い）
 *  - warnings: 掲載はできるが運営者が確認する表現（二重価格・期間限定など、事実なら問題ないもの）
 * 機械的な一次チェックであり、最終的な判断は運営者が行う。
 */
export type CheckResult = { blocked: string[]; warnings: string[] };

type Rule = { pattern: RegExp; reason: string };

const BLOCK_RULES: Rule[] = [
  { pattern: /(日本一|世界一|県内一|佐賀一|九州一|地域一番|業界一)/, reason: "「〇〇一」は客観的な根拠を示せないと不当表示（優良誤認）になるおそれがあります" },
  { pattern: /(no\.?\s*1|ナンバー\s*ワン|ナンバーワン|№\s*1|第\s*1\s*位)/i, reason: "「No.1」は調査の根拠と出典の表示が必要なため、ここでは使えません" },
  { pattern: /(最安|最低価格|どこよりも安|地域最安|業界最安)/, reason: "「最安」は他店すべてとの比較が必要なため使えません（有利誤認のおそれ）" },
  { pattern: /(絶対|必ず|確実に|100\s*[%％]\s*(効|満足|保証|成功|治))/, reason: "「絶対」「必ず」など効果を断定する表現は使えません" },
  { pattern: /(治る|治す|完治|治療|効く|効能|改善します|病気が|がんに|ガンに|血圧が下が|血糖値が下が)/, reason: "病気の治療や効能をうたう表現は医薬品医療機器等法で禁止されています" },
  { pattern: /(必ず痩せ|確実に痩せ|飲むだけで痩せ|食べるだけで痩せ|\d+\s*(kg|キロ)\s*痩せ)/i, reason: "痩身効果の断定は不当表示・医薬品医療機器等法違反のおそれがあります" },
];

const WARN_RULES: Rule[] = [
  { pattern: /(通常価格|定価|元値|当店通常|メーカー希望|市価|他店価格)/, reason: "比較対照価格（二重価格）は、その価格で直近に相当期間販売した実績が必要です" },
  { pattern: /(今だけ|本日限り|今日だけ|期間限定|先着|残りわずか|限定\s*\d+)/, reason: "期間・数量の限定は、実際にその条件で行う場合だけ使えます" },
  { pattern: /(激安|格安|破格|大特価|超お得)/, reason: "安さを強調する表現は、実際の価格と合っているか確認してください" },
  { pattern: /(人気|話題|大好評|行列|満足度)/, reason: "人気・満足度の表現は、根拠となる事実があるか確認してください" },
  { pattern: /(無料|タダ|(?<![\d,，０-９])[0０]\s*円)/, reason: "「無料」は、追加料金や条件がある場合は同じ場所に明記してください" },
];

const PERCENT = /(\d{1,3})\s*[%％]\s*(off|オフ|引|割引)/gi;
const WARI = /([1-9])\s*割\s*(引|off|オフ)/gi;

/** タイトル等に書かれた割引率と、登録した割引率が食い違っていないか */
function discountMismatch(text: string, discountRate: number): string | null {
  const stated = new Set<number>();
  for (const m of text.matchAll(PERCENT)) stated.add(Number(m[1]));
  for (const m of text.matchAll(WARI)) stated.add(Number(m[1]) * 10);
  if (/半額/.test(text)) stated.add(50);
  for (const n of stated) {
    if (n > discountRate) return `本文の「${n}%」が、登録した割引率（${discountRate}%）より大きく、実際より有利に見えます`;
  }
  return null;
}

export function checkPromoText(text: string, discountRate?: number): CheckResult {
  const blocked = BLOCK_RULES.filter((r) => r.pattern.test(text)).map((r) => r.reason);
  const warnings = WARN_RULES.filter((r) => r.pattern.test(text)).map((r) => r.reason);
  if (discountRate !== undefined) {
    const mismatch = discountMismatch(text, discountRate);
    if (mismatch) blocked.push(mismatch);
    if (discountRate >= 90) warnings.push("割引率が 90% 以上です。誤入力でないか、実際に提供できるか確認してください");
  }
  return { blocked, warnings };
}

export const checkCoupon = (c: { title: string; conditions?: string | null; discount_rate: number }) =>
  checkPromoText(`${c.title}\n${c.conditions ?? ""}`, c.discount_rate);

export const checkAd = (a: { headline: string; body?: string | null }) => checkPromoText(`${a.headline}\n${a.body ?? ""}`);

/** 掲載できないときのエラーメッセージ */
export const blockedMessage = (r: CheckResult) =>
  `この内容では掲載できません。表現を見直してください：\n・${r.blocked.join("\n・")}`;
