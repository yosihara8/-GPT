"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Ticket } from "lucide-react";
import { eventPeriod, eventStatus, type SagaEvent } from "@/lib/events";

/** 地図の画面の「イベント特集」（開催中・もうすぐのイベント。タップで特集ページ） */
export default function EventBanners() {
  const [events, setEvents] = useState<SagaEvent[]>([]);
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);
  if (events.length === 0) return null;
  return (
    <section className="pt-4" aria-label="イベント特集">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4">
        {events.map((ev) => {
          const st = eventStatus(ev);
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className={`relative block shrink-0 snap-start overflow-hidden rounded-3xl text-white shadow-pop ${events.length > 1 ? "w-[86%] sm:w-[420px]" : "w-full"}`}
              style={{ background: ev.color }}
            >
              <img src="/art/panorama.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-soft-light" aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" aria-hidden />
              <div className="relative p-4">
                <p className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="num tracking-[0.25em] text-white/85">イベント</span>
                  <span className={`rounded-full px-2 py-0.5 ${st.live ? "bg-white text-slate-900" : "bg-black/30"}`}>{st.label}</span>
                </p>
                <p className="mt-1 font-mincho text-[19px] font-bold leading-snug drop-shadow">{ev.title}</p>
                <p className="num mt-0.5 text-xs text-white/90">
                  {eventPeriod(ev)}
                  {ev.area ? `・${ev.area}` : ""}
                </p>
                <p className="mt-2 flex items-center gap-1 text-sm font-bold">
                  <Ticket className="h-4 w-4" aria-hidden />
                  {(ev.coupon_count ?? 0) > 0 ? `限定クーポン ${ev.coupon_count} 件` : "特集を見る"}
                  <ChevronRight className="ml-auto h-5 w-5" aria-hidden />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
