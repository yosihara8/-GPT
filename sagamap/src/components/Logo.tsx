/** 佐賀観光マップのブランドマーク（地図のピンの中に、バルーンフェスタの熱気球） */
export default function Logo({ className = "h-8 w-8", light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 62S8 38 8 24a24 24 0 0 1 48 0c0 14-24 38-24 38z" fill={light ? "#FAF6EF" : "#1E3A6E"} />
      <path d="M32 9c-9 0-15 7-15 15 0 7 8 14 11 18h8c3-4 11-11 11-18 0-8-6-15-15-15z" fill="#EE6A3A" />
      <path d="M32 9c-3.5 0-5.5 7-5.5 15 0 7 2.5 14 3.5 18h4c1-4 3.5-11 3.5-18 0-8-2-15-5.5-15z" fill={light ? "#1E3A6E" : "#FAF6EF"} />
      <rect x="28.5" y="44" width="7" height="5" rx="1.2" fill={light ? "#1E3A6E" : "#FAF6EF"} />
    </svg>
  );
}
