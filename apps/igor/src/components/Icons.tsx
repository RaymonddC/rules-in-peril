// Inline stroke icons. Decorative: always aria-hidden.

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconArrow = () => (
  <svg {...base}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const IconLock = () => (
  <svg {...base} width={16} height={16}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconUpload = () => (
  <svg {...base} width={40} height={40} stroke="var(--ember-text)" strokeWidth={1.8}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

export const IconGrave = () => (
  <svg {...base} width={16} height={16}>
    <path d="M6 21V10a6 6 0 0 1 12 0v11" />
    <path d="M4 21h16" />
    <path d="M10 13h4" />
  </svg>
);

export const IconCheck = ({ color = "#6FC39B" }: { color?: string }) => (
  <svg {...base} stroke={color} strokeWidth={2.4} style={{ flexShrink: 0 }}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);

export const IconDownload = () => (
  <svg {...base}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </svg>
);

export const IconGhost = () => (
  <svg width="34" height="38" viewBox="0 0 34 38" aria-hidden="true">
    <path d="M3 36 V16 a14 14 0 0 1 28 0 V36 l-4.6 -4 l-4.6 4 l-4.8 -4 l-4.8 4 l-4.6 -4 Z" fill="var(--ember)" />
    <circle cx="12" cy="16" r="2.4" fill="var(--ink)" />
    <circle cx="22" cy="16" r="2.4" fill="var(--ink)" />
  </svg>
);
