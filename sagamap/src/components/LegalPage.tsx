/** 規約系ページの共通レイアウト */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <article className="card space-y-4 p-6 text-sm leading-7 text-slate-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">最終更新日：{updated}</p>
        {children}
      </article>
    </main>
  );
}
