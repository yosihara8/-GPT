/** SagaMap のロゴマーク（地図のピンと、佐賀の「S」をかたどった道） */
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`text-saga-600 ${className}`} aria-hidden>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M16 6.5c-4.1 0-7.3 3.1-7.3 7.1 0 5.2 7.3 11.9 7.3 11.9s7.3-6.7 7.3-11.9c0-4-3.2-7.1-7.3-7.1z"
        fill="#fff"
      />
      <path d="M18.6 11.2c-.7-.8-1.6-1.2-2.7-1.2-1.4 0-2.4.8-2.4 1.9 0 2.4 5.2 1.4 5.2 4 0 1.2-1.1 2.1-2.7 2.1-1.2 0-2.2-.5-2.9-1.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
