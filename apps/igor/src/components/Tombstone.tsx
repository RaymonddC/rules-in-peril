export function HeroTombstone() {
  return (
    <svg
      width="300"
      height="260"
      viewBox="0 0 300 260"
      role="img"
      aria-label="Tombstone: here lies monster 17, walked past 7 rules, caught by RIP"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <circle cx="248" cy="40" r="16" fill="#EFE3C8" />
      <circle cx="256" cy="34" r="14" fill="var(--ground)" />
      <ellipse cx="150" cy="236" rx="130" ry="10" fill="var(--line)" />
      <path d="M60 236 V100 a90 90 0 0 1 180 0 V236 Z" fill="var(--night-2)" />
      <path d="M156 24 l-10 40 l14 26 l-12 34" stroke="#3E3947" strokeWidth="3" fill="none" />
      <text x="150" y="112" textAnchor="middle" fontSize="12" letterSpacing="2" fill="#B9B2C4">
        HERE LIES
      </text>
      <text x="150" y="142" textAnchor="middle" fontWeight="700" fontSize="22" fill="var(--on-night)">
        Monster #17
      </text>
      <text x="150" y="170" textAnchor="middle" fontSize="13" fill="var(--on-night-2)">
        Walked past 7 rules.
      </text>
      <text x="150" y="190" textAnchor="middle" fontSize="13" fill="var(--on-night-2)">
        Caught by RIP.
      </text>
      <path d="M54 236 l6 -18 l6 18 M232 236 l6 -16 l6 16 M244 236 l5 -12 l5 12" fill="#3E8A6A" />
    </svg>
  );
}
