"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import type { Notice } from "@/components/customer/NotificationList";

/**
 * お客さまのお知らせ。markSeen() を呼ぶと（＝一覧を見たら）すべて既読になり、未読の数は 0 になる。
 * 見ている間は「新着」の印を残すため、開いたときの未読を freshIds に覚えておく。
 */
export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<Notice[]>([]);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const d = await api<{ notifications: Notice[] }>("/api/notifications");
      setItems(d.notifications);
    } catch {
      setItems([]);
    }
  }, [enabled]);
  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  const markSeen = useCallback(() => {
    setItems((xs) => {
      const unseen = xs.filter((n) => !n.read_at);
      if (unseen.length === 0) return xs;
      setFreshIds((s) => new Set([...Array.from(s), ...unseen.map((n) => n.id)]));
      api("/api/notifications", { method: "PATCH", body: JSON.stringify({ ids: unseen.map((n) => n.id) }) }).catch(() => {});
      const now = new Date().toISOString();
      return xs.map((n) => (n.read_at ? n : { ...n, read_at: now }));
    });
  }, []);

  const remove = useCallback(async (n: Notice) => {
    setItems((xs) => xs.filter((x) => x.id !== n.id));
    await api(`/api/notifications?id=${n.id}`, { method: "DELETE" }).catch(() => {});
  }, []);
  const removeRead = useCallback(async () => {
    setItems((xs) => xs.filter((x) => freshIds.has(x.id)));
    await api(`/api/notifications?read=1&keep=${Array.from(freshIds).join(",")}`, { method: "DELETE" }).catch(() => {});
  }, [freshIds]);

  return { items, unread, freshIds, markSeen, remove, removeRead, reload: load };
}
