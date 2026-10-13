"use client";

import BizPage, { StorePicker } from "@/components/business/BizPage";
import { useOwnerData } from "@/components/business/useOwnerData";
import { AddStore, MenuEditor, StoreEditor } from "@/components/business/StoreForms";
import PhotoUploader from "@/components/PhotoUploader";
import PhotoGallery from "@/components/business/PhotoGallery";
import ScheduleEditor from "@/components/business/ScheduleEditor";
import SnsShare from "@/components/business/SnsShare";
import ProfileScore from "@/components/business/ProfileScore";
import AnchorTabs from "@/components/ui/AnchorTabs";

const TABS = [
  { id: "sec-score", label: "充実度" },
  { id: "sec-main-photo", label: "写真" },
  { id: "sec-store", label: "基本情報" },
  { id: "sec-schedule", label: "営業時間" },
  { id: "sec-menu", label: "メニュー" },
  { id: "sec-share", label: "SNS で宣伝" },
];

/** お店の情報（お客さまのお店のページに出る内容をまとめて編集する） */
export default function StorePage() {
  const { stores, store, storeId, setStoreId, premium, load } = useOwnerData();
  return (
    <BizPage
      eyebrow="MY SHOP"
      title="お店の情報"
      lead="ここで入れた内容が、お客さまのお店のページにそのまま出ます。"
      aside={<StorePicker stores={stores} value={storeId} onChange={setStoreId} />}
    >
      <AnchorTabs items={TABS} />
      {store && (
        <>
          <div id="sec-score" className="scroll-mt-32">
            <ProfileScore store={store} premium={premium} />
          </div>
          <div id="sec-main-photo" className="scroll-mt-32">
            <PhotoUploader key={`photo-${store.id}`} shop={store} onChanged={load} />
          </div>
          <div id="sec-photos" className="scroll-mt-32">
            <PhotoGallery key={`gallery-${store.id}`} storeId={store.id} premium={premium} onChanged={load} />
          </div>
          <div id="sec-store" className="scroll-mt-32">
            <StoreEditor key={store.id} store={store} premium={premium} onSaved={load} />
          </div>
          <div id="sec-schedule" className="scroll-mt-32">
            <ScheduleEditor
              key={`sched-${store.id}`}
              storeId={store.id}
              weeklyHours={store.weekly_hours}
              hoursNote={store.hours_note}
              specials={store.special_days}
              businessHours={store.business_hours}
              closedDays={store.closed_days}
              onSaved={load}
            />
          </div>
          <div id="sec-menu" className="scroll-mt-32">
            <MenuEditor key={`menu-${store.id}`} storeId={store.id} onChanged={load} />
          </div>
          <div id="sec-share" className="scroll-mt-32">
            <SnsShare key={`share-${store.id}`} storeId={store.id} storeName={store.name} />
          </div>
          {premium && <AddStore onAdded={load} />}
        </>
      )}
    </BizPage>
  );
}
