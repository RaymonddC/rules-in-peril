import type { CSSProperties } from "react";

// Guardrails drawn as a ring of salt around the agent. Grey dots are monsters
// caught at the ring; orange dots inside walked through. One dashed path
// traces the smallest breach. Positions come from a fixed seed, so the picture
// is the same on every load.
//
// With `play`, the ring draws itself once (motion.css): salt grains appear
// around the circle, the guardrails are placed, monsters fly in and stop at
// the ring, the walkers pass through, then the breach path lights up.

const CX = 280;
const CY = 280;
const R = 180;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const v = (o: Record<string, string | number>) => o as CSSProperties;

function layout(guardrailCount: number, caught: number, walked: number) {
  const next = rng(1818);
  const grains = Array.from({ length: 80 }, (_, k) => {
    const a = (k / 80) * Math.PI * 2;
    const j = (next() - 0.5) * 8;
    return { x: CX + Math.cos(a) * (R + j), y: CY + Math.sin(a) * (R + j), r: 2.6 + next() * 2.2 };
  });
  // Keep the breach path's corridor (upper right) clear of caught dots.
  const outside = Array.from({ length: caught }, () => {
    let b = next() * Math.PI * 2;
    if (b > 5.2 && b < 5.75) b += 0.6;
    const rr = 205 + next() * 62;
    return { x: CX + Math.cos(b) * rr, y: CY + Math.sin(b) * rr, dx: Math.cos(b) * 70, dy: Math.sin(b) * 70 };
  });
  const inside = Array.from({ length: Math.max(walked - 1, 0) }, () => {
    const c = next() * Math.PI * 2;
    const ri = 60 + next() * 70;
    // Start well outside the ring on the same bearing.
    const reach = 300 - ri;
    return { x: CX + Math.cos(c) * ri, y: CY + Math.sin(c) * ri, dx: Math.cos(c) * reach, dy: Math.sin(c) * reach };
  });
  const marks = Array.from({ length: guardrailCount }, (_, g) => {
    const ang = (g / guardrailCount) * Math.PI * 2 - Math.PI / 2 + 0.3;
    return { x: CX + Math.cos(ang) * (R - 34), y: CY + Math.sin(ang) * (R - 34) };
  });
  return { grains, outside, inside, marks };
}

export function Ring({
  guardrailIds,
  caught,
  walked,
  breachSteps,
  play,
}: {
  guardrailIds: string[];
  caught: number;
  walked: number;
  breachSteps: number;
  play: boolean;
}) {
  const { grains, outside, inside, marks } = layout(guardrailIds.length, caught, walked);
  const path = Array.from({ length: breachSteps }, (_, i) => {
    const t = (i + 1) / breachSteps;
    return { x: 520 - (520 - 312) * t, y: 70 + (266 - 70) * t };
  });

  return (
    <svg
      className="ring"
      data-play={play}
      viewBox="0 0 560 560"
      width="100%"
      role="img"
      aria-label={`Guardrails drawn as a ring of salt around the agent. ${caught} monsters are caught at the ring; ${walked} walk through it. The smallest breach is traced in ${breachSteps} steps.`}
      style={{ maxWidth: 560, alignSelf: "center" }}
    >
      <circle cx={CX} cy={CY} r={150} fill="#201D27" />
      {outside.map((o, i) => (
        <circle key={`o${i}`} className="ring-hit" style={v({ "--i": i, "--dx": `${o.dx}px`, "--dy": `${o.dy}px` })} cx={o.x} cy={o.y} r={5} fill="var(--ash)" />
      ))}
      {grains.map((g, i) => (
        <circle key={`g${i}`} className="ring-grain" style={v({ "--i": i })} cx={g.x} cy={g.y} r={g.r} fill="var(--salt)" />
      ))}
      {marks.map((m, i) => (
        <g key={`m${i}`} className="ring-mark" style={v({ "--i": i })}>
          <circle cx={m.x} cy={m.y} r={15} fill="var(--ground)" stroke="#6B6476" strokeWidth={1.5} />
          <text x={m.x} y={m.y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="#E4DEEC">
            {guardrailIds[i]}
          </text>
        </g>
      ))}
      {inside.map((p, i) => (
        <circle key={`i${i}`} className="ring-in" style={v({ "--i": i, "--dx": `${p.dx}px`, "--dy": `${p.dy}px` })} cx={p.x} cy={p.y} r={6} fill="var(--ember)" opacity={0.75} />
      ))}
      <path className="ring-path" d={`M520 70 ${path.map((p) => `L${p.x} ${p.y}`).join(" ")}`} stroke="var(--ember)" strokeWidth={2.5} strokeDasharray="7 6" fill="none" />
      {path.map((p, i) => (
        <circle key={`p${i}`} className="ring-breach" style={v({ "--i": i })} cx={p.x} cy={p.y} r={8} fill="var(--ember)" />
      ))}
      <rect x={244} y={252} width={72} height={56} rx={12} fill="#2E2A37" stroke="#4A4552" />
      <text x={280} y={276} textAnchor="middle" fontWeight={700} fontSize={13} fill="var(--ink)">
        Agent
      </text>
      <text x={280} y={294} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
        refund desk
      </text>
    </svg>
  );
}
