"use client";

import BizPage from "@/components/business/BizPage";
import ContactForm from "@/components/ContactForm";

/** 事業主のお問い合わせ */
export default function BusinessContactPage() {
  return (
    <BizPage eyebrow="CONTACT" title="お問い合わせ" lead="掲載・クーポン・広告・プランなど、お気軽にお問い合わせください。原則 3 営業日以内にメールでご返信します。">
      <ContactForm role="business" />
    </BizPage>
  );
}
