/**
 * 要素まで画面を動かす。パソコン表示で一覧パネルが独立してスクロールする場合は、
 * パネルの中だけを動かす（地図はそのまま見えている）。
 */
export function scrollToElement(id: string, panelId?: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const panel = panelId ? document.getElementById(panelId) : null;
  if (panel && getComputedStyle(panel).overflowY === "auto") {
    panel.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
