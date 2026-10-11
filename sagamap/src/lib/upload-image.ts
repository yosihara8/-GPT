/** 広告・クーポン画像の上限（ブラウザで縮小した JPEG） */
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

/**
 * base64 の画像を確認して Buffer にする。
 * 中身が本当に JPEG か確認する（拡張子や Content-Type は偽装できるため）。
 */
export function decodeJpegBase64(b64: string): { ok: true; image: Buffer } | { ok: false; error: string } {
  const image = Buffer.from(b64, "base64");
  if (image.length === 0 || image.length > MAX_IMAGE_BYTES) return { ok: false, error: "画像は 1.5MB 以下にしてください" };
  if (!(image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff)) return { ok: false, error: "JPEG 形式の画像を送ってください" };
  return { ok: true, image };
}
