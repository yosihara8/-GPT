"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { EVENT_TEMPLATES, eventPeriod, eventStatus, type SagaEvent } from "@/lib/events";

type Form = {
  id?: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  area: string;
  startsOn: string;
  endsOn: string;
  color: string;
  linkUrl: string;
  lat: number | null;
  lng: number | null;
  isPublished: boolean;
};

const empty: Form = { slug: "", title: "", subtitle: "", description: "", area: "", startsOn: "", endsOn: "", color: "#1E3A6E", linkUrl: "", lat: null, lng: null, isPublished: true };

/**
 * 運営者のイベント特集の管理。
 * 期間中（と開催 60 日前から）、お客さまの地図の画面に特集が出て、事業主はイベント限定クーポンを出せる。
 */
export default function EventsAdmin() {
  const [events, setEvents] = useState<SagaEvent[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => api<{ events: SagaEvent[] }>("/api/admin/events").then((d) => setEvents(d.events)), []);
  useEffect(() => {
    load();
  }, [load]);
  const year = new Date().getFullYear();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save() {
    if (!form) return;
    setMsg(null);
    try {
      await api("/api/admin/events", { method: form.id ? "PATCH" : "POST", body: JSON.stringify(form) });
      setMsg(form.id ? "変更しました" : "作成しました。期間の 60 日前から、お客さまの地図の画面に出ます。");
      setForm(null);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function remove(ev: SagaEvent) {
    if (!confirm(`「${ev.title}」を削除しますか？（限定クーポンは通常のクーポンとして残ります）`)) return;
    await api(`/api/admin/events?id=${ev.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h2 className="font-bold">イベント特集</h2>
        <p className="text-sm text-slate-600">
          バルーンフェスタなどの期間に合わせて特集ページを作ります。開催の 60 日前から終わりの日まで、お客さまの地図の画面に特集が出ます。
          事業主はクーポン発行の画面で「イベント限定」を選べます。
        </p>
        <p className="text-sm font-bold">ひな形から作る（日付だけ入れてください）</p>
        <div className="flex flex-wrap gap-2">
          {EVENT_TEMPLATES.map((t) => (
            <button
              key={t.slug}
              type="button"
              className="chip-off"
              onClick={() =>
                setForm({ ...empty, ...t, slug: `${t.slug}-${year}`, startsOn: "", endsOn: "", linkUrl: "", lat: t.lat, lng: t.lng })
              }
            >
              {t.title}
            </button>
          ))}
          <button type="button" className="chip-off" onClick={() => setForm({ ...empty })}>
            ＋ 白紙から
          </button>
        </div>
        {msg && <p className="text-sm font-bold text-saga-700">{msg}</p>}
      </section>

      {form && (
        <section className="card space-y-3" aria-label="イベントの入力">
          <div className="grid gap-3 sm:grid-cols-2">
            <L label="イベント名">
              <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </L>
            <L label="URL 用の名前（半角英数字）">
              <input className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="balloon-2026" />
            </L>
            <L label="始まりの日">
              <input type="date" className="input" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
            </L>
            <L label="終わりの日">
              <input type="date" className="input" value={form.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
            </L>
            <L label="ひとこと">
              <input className="input" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </L>
            <L label="場所">
              <input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} />
            </L>
            <div className="sm:col-span-2">
              <L label="紹介文">
                <textarea className="input" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </L>
            </div>
            <L label="公式サイト（任意）">
              <input className="input" value={form.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://…" />
            </L>
            <L label="色">
              <input type="color" className="h-11 w-full rounded-xl border border-slate-300" value={form.color} onChange={(e) => set("color", e.target.value)} />
            </L>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="h-4 w-4" />
            公開する
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={save}>
              {form.id ? "変更する" : "作成する"}
            </button>
            <button type="button" className="btn-outline" onClick={() => setForm(null)}>
              やめる
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="font-bold">作成したイベント</h3>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">まだありません。</p>
        ) : (
          <ul className="mt-2 divide-y">
            {events.map((ev) => {
              const st = eventStatus(ev);
              return (
                <li key={ev.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                  <span className="h-4 w-4 rounded-full" style={{ background: ev.color }} aria-hidden />
                  <b>{ev.title}</b>
                  <span className="num text-slate-500">{eventPeriod(ev)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.live ? "bg-asa-500 text-white" : "bg-slate-100 text-slate-600"}`}>{st.label}</span>
                  {!ev.is_published && <span className="text-xs text-amber-700">非公開</span>}
                  <span className="text-xs text-slate-500">限定クーポン {ev.coupon_count ?? 0} 件</span>
                  <span className="ml-auto flex gap-2">
                    <a href={`/events/${ev.slug}`} target="_blank" rel="noreferrer" className="text-saga-600 underline">
                      見る
                    </a>
                    <button
                      type="button"
                      className="text-saga-600 underline"
                      onClick={() =>
                        setForm({
                          id: ev.id,
                          slug: ev.slug,
                          title: ev.title,
                          subtitle: ev.subtitle,
                          description: ev.description,
                          area: ev.area,
                          startsOn: ev.starts_on,
                          endsOn: ev.ends_on,
                          color: ev.color,
                          linkUrl: ev.link_url ?? "",
                          lat: ev.lat,
                          lng: ev.lng,
                          isPublished: ev.is_published ?? true,
                        })
                      }
                    >
                      直す
                    </button>
                    <button type="button" className="text-red-600 underline" onClick={() => remove(ev)}>
                      削除
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
