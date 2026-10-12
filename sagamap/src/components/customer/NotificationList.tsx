"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Ticket, Megaphone, Bell, X } from "lucide-react";

export type Notice = { id: number; title: string; body: string; link: string | null; created_at: string; read_at: string | null; kind?: string };

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  if (m < 1440) return `${Math.floor(m / 60)}時間前`;
  if (m < 1440 * 7) return `${Math.floor(m / 1440)}日前`;
  return new Date(iso).toLocaleDateString("ja-JP");
};

/**
 * お知らせの一覧（マイページ・地図の画面で共通）。
 * 開いた時点で既読にするので、「新着」はこの画面を見ている間だけ印を付けて上に出し、読んだものは「以前のお知らせ」にたたむ。
 */
export default function NotificationList({
  items,
  freshIds,
  onOpen,
  onDelete,
  onDeleteRead,
}: {
  items: Notice[];
  /** この画面を開いたときに未読だったお知らせ */
  freshIds: Set<number>;
  onOpen: (n: Notice) => void;
  onDelete: (n: Notice) => void;
  onDeleteRead: () => void;
}) {
  const [showOld, setShowOld] = useState(false);
  const fresh = items.filter((n) => freshIds.has(n.id));
  const old = items.filter((n) => !freshIds.has(n.id));

  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">
        新しいお知らせはありません。近くのお店がクーポンを出すと、ここに届きます。
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {fresh.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200/70">新しいお知らせはありません。</p>}
      {fresh.map((n) => (
        <Row key={n.id} n={n} fresh onOpen={onOpen} onDelete={onDelete} />
      ))}
      {old.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowOld((v) => !v)}
            aria-expanded={showOld}
            className="flex w-full items-center gap-1 py-2 text-sm font-bold text-slate-500"
          >
            以前のお知らせ（{old.length}件）
            <ChevronDown className={`h-4 w-4 transition ${showOld ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showOld && (
            <div className="space-y-2">
              {old.map((n) => (
                <Row key={n.id} n={n} onOpen={onOpen} onDelete={onDelete} />
              ))}
              <button type="button" onClick={onDeleteRead} className="w-full py-2 text-xs font-bold text-slate-500 underline">
                以前のお知らせをすべて消す
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ n, fresh, onOpen, onDelete }: { n: Notice; fresh?: boolean; onOpen: (n: Notice) => void; onDelete: (n: Notice) => void }) {
  const Icon = n.link?.includes("/coupons/") ? Ticket : n.link?.includes("shop=") ? Megaphone : Bell;
  return (
    <div className={`relative flex gap-3 rounded-2xl bg-white p-3 pr-10 ring-1 ${fresh ? "ring-asa-500/50" : "ring-slate-200/70 opacity-80"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${fresh ? "bg-asa-50 text-asa-600" : "bg-slate-100 text-slate-500"}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <button type="button" onClick={() => onOpen(n)} disabled={!n.link} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          {fresh && <span className="rounded-full bg-asa-500 px-1.5 py-px text-[10px] font-bold text-white">NEW</span>}
          {ago(n.created_at)}
        </span>
        <span className="mt-0.5 block font-bold leading-snug">{n.title}</span>
        <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-sm text-slate-600">{n.body}</span>
        {n.link && (
          <span className="mt-1 inline-flex items-center text-sm font-bold text-saga-600">
            {n.link.includes("/coupons/") ? "クーポンを見る" : "お店を見る"}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </button>
      <button type="button" onClick={() => onDelete(n)} aria-label="このお知らせを消す" className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
