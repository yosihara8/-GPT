export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  // 管理画面のログインの期限（12 時間）が切れたら、エラーにせずログイン画面へ移る
  if (res.status === 401 && typeof window !== "undefined" && url.startsWith("/api/admin") && window.location.pathname.startsWith("/admin")) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 画面の部品の外から呼ばれるため、読み込み直して移る
    window.location.href = "/admin/login?expired=1";
    return new Promise<T>(() => {});
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `エラーが発生しました (${res.status})`, res.status, data);
  return data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown>,
  ) {
    super(message);
  }
}
