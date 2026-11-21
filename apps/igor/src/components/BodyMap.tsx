import type { BodyPart, Stitch } from "../lab/types";

// A stitched figure. Each body part stands for one stitch of the identity.
// Parts that shrinking removed are drawn dashed.

const LABEL: Record<BodyPart, string> = {
  name: "Name",
  idNumber: "ID number",
  network: "Network",
  email: "Email",
  phone: "Phone",
  address: "Address",
  device: "Device",
};

// Where each callout sits: [lineFrom x, y, lineTo x, y, text x, title y].
const CALLOUT: Record<BodyPart, [number, number, number, number, number, number]> = {
  name: [164, 70, 96, 52, 8, 44],
  network: [264, 97, 326, 80, 332, 72],
  idNumber: [250, 214, 326, 176, 332, 166],
  email: [132, 232, 96, 232, 8, 226],
  phone: [308, 262, 326, 262, 332, 256],
  address: [196, 400, 96, 400, 8, 394],
  device: [244, 400, 326, 400, 332, 394],
};

interface Paint {
  fill: string;
  stroke: string;
  dash?: string;
  status: string;
  ink: string;
}

function paint(stitch: Stitch | undefined, cut: boolean): Paint {
  if (!stitch) return { fill: "#EFE9DE", stroke: "#D8CFBF", status: "own", ink: "var(--ink-3)" };
  if (cut) return { fill: "#EFE9DE", stroke: "#B9AE9C", dash: "6 5", status: "cut", ink: "var(--ink-3)" };
  return stitch.kind === "invented"
    ? { fill: "var(--invented)", stroke: "var(--ink)", status: `invented${stitch.note !== "invented" ? " · " + stitch.note : ""}`, ink: "var(--invented-text)" }
    : { fill: "var(--borrowed)", stroke: "var(--ink)", status: `borrowed · ${stitch.note}`, ink: "var(--borrowed-text)" };
}

export function BodyMap({ stitches, cut }: { stitches: Stitch[]; cut: BodyPart[] }) {
  const byPart = new Map(stitches.map((s) => [s.part, s]));
  const p = (part: BodyPart) => paint(byPart.get(part), cut.includes(part));
  // Paint goes in style, not attributes, so the CSS transition on .part runs.
  const shape = (part: BodyPart) => {
    const c = p(part);
    return { className: "part", style: { fill: c.fill, stroke: c.stroke }, strokeWidth: 2, strokeDasharray: c.dash };
  };
  const left = stitches.filter((s) => !cut.includes(s.part));
  const label =
    cut.length === 0
      ? `Body map: ${stitches.length} stitched parts`
      : `Body map: ${left.map((s) => LABEL[s.part]).join(", ")} left; ${cut.length} cut away`;

  return (
    <svg viewBox="0 0 490 470" width="100%" role="img" aria-label={label} style={{ maxWidth: 520, alignSelf: "center" }}>
      <rect x="196" y="300" width="22" height="130" rx="10" {...shape("address")} />
      <rect x="222" y="300" width="22" height="130" rx="10" {...shape("device")} />
      <rect x="132" y="168" width="34" height="128" rx="16" {...shape("email")} />
      <rect x="274" y="168" width="34" height="128" rx="16" {...shape("phone")} />
      <rect x="170" y="160" width="100" height="146" rx="16" {...shape("idNumber")} />
      <rect x="190" y="196" width="60" height="38" rx="5" fill="var(--ground)" opacity="0.85" />
      <path d="M197 222 h20 M197 214 h30 M232 205 h12 v14 h-12 Z" stroke="var(--ink)" strokeWidth="2" fill="none" />
      <circle cx="220" cy="98" r="58" {...shape("name")} />
      <rect x="176" y="84" width="88" height="26" rx="13" {...shape("network")} />
      <circle cx="202" cy="97" r="4.5" fill="var(--ink)" />
      <circle cx="238" cy="97" r="4.5" fill="var(--ink)" />
      <path d="M206 128 h28 M210 123 v10 M218 123 v10 M226 123 v10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />

      {(Object.keys(CALLOUT) as BodyPart[]).map((part) => {
        const [x1, y1, x2, y2, tx, ty] = CALLOUT[part];
        const c = p(part);
        return (
          <g key={part}>
            <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#9A9083" strokeWidth="1.5" />
            <text x={tx} y={ty} fontSize="15" fontWeight="700" fill="var(--ink)">
              {LABEL[part]}
            </text>
            <text x={tx} y={ty + 18} fontSize="13" fill={c.ink}>
              {c.status}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
