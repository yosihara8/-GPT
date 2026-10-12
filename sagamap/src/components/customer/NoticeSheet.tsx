"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import NotificationList, { type Notice } from "./NotificationList";

/** 地図の画面のお知らせ（下から出る）。開いた時点で既読にする */
export default function NoticeSheet({
  open,
  items,
  freshIds,
  onSeen,
  onClose,
  onOpenNotice,
  onDelete,
  onDeleteRead,
}: {
  open: boolean;
  items: Notice[];
  freshIds: Set<number>;
  onSeen: () => void;
  onClose: () => void;
  onOpenNotice: (n: Notice) => void;
  onDelete: (n: Notice) => void;
  onDeleteRead: () => void;
}) {
  useEffect(() => {
    if (open) onSeen();
  }, [open, onSeen]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="お知らせ"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-[#FAF6EF] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Bell className="h-5 w-5 text-asa-500" aria-hidden />
            お知らせ
          </h2>
          <button type="button" onClick={onClose} aria-label="お知らせを閉じる" className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">
          <NotificationList items={items} freshIds={freshIds} onOpen={onOpenNotice} onDelete={onDelete} onDeleteRead={onDeleteRead} />
          <Link href="/dashboard/customer#settings" className="mt-3 block text-center text-xs text-slate-500 underline">
            お知らせメールの設定
          </Link>
        </div>
      </div>
    </div>
  );
}
