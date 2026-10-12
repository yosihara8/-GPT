import { redirect } from "next/navigation";

/** 利用履歴はマイページの中にまとめた（古いリンクのために残す） */
export default function HistoryPage() {
  redirect("/dashboard/customer#history");
}
