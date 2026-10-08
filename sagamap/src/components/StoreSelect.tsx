"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

export function useMyStores() {
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    api<{ stores: { id: number; name: string }[] }>("/api/me").then((d) => setStores(d.stores));
  }, []);
  return stores;
}

export default function StoreSelect({ stores }: { stores: { id: number; name: string }[] }) {
  if (stores.length <= 1) return <input type="hidden" name="businessId" value={stores[0]?.id ?? ""} />;
  return (
    <div>
      <label className="label">店舗</label>
      <select name="businessId" className="input">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
