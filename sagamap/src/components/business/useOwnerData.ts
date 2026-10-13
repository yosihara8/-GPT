"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import type { Owner, Store } from "./StoreForms";

const KEY = "sagamap-store";

/** 事業主のアカウントと店舗（どの画面でも、選んだ店舗を覚えておく） */
export function useOwnerData() {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreIdState] = useState<number | null>(null);

  const load = useCallback(async () => {
    const me = await api<{ owner: Owner; stores: Store[] }>("/api/me");
    setOwner(me.owner);
    setStores(me.stores);
    setStoreIdState((id) => {
      if (id && me.stores.some((s) => s.id === id)) return id;
      let saved: number | null = null;
      try {
        saved = Number(localStorage.getItem(KEY)) || null;
      } catch {
        /* 保存できない環境でも動く */
      }
      return me.stores.find((s) => s.id === saved)?.id ?? me.stores[0]?.id ?? null;
    });
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const setStoreId = (id: number) => {
    setStoreIdState(id);
    try {
      localStorage.setItem(KEY, String(id));
    } catch {
      /* 保存できなくても動く */
    }
  };
  const store = stores.find((s) => s.id === storeId) ?? null;
  return { owner, stores, store, storeId, setStoreId, premium: owner?.plan === "premium", load };
}
