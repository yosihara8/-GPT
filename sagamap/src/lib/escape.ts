/** HTML として埋め込む文字列のエスケープ（地図のツールチップ・メール本文など） */
export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
