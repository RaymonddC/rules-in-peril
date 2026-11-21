import { href, type Route } from "../lab/route";
import { useLab } from "../lab/lab-state";
import { IconGrave } from "./Icons";

export type Step = 1 | 2 | 3 | 4;

/** The RIP front door. Set only in the combined site build (build-site.mjs). */
const LANDING = import.meta.env.VITE_LANDING_URL;

// Each step is a link, so the path through the lab is always visible and
// you can jump back to any step you have reached.
const STEPS: { n: Step; label: string; hint: string; to: Route }[] = [
  { n: 1, label: "Load", hint: "Pick the rules", to: { screen: "start" } },
  { n: 2, label: "Attack", hint: "See who got in", to: { screen: "lab" } },
  { n: 3, label: "Shrink", hint: "Find the core", to: { screen: "autopsy", monsterId: 17 } },
  { n: 4, label: "Patch", hint: "Price a fix", to: { screen: "close-the-gap" } },
];

export function Header({ step }: { step: Step }) {
  const { seed, activeRules, buried, run } = useLab();
  const reached = run ? 4 : 1;
  return (
    <header className="top">
      <a className="brand" href={href({ screen: "start" })}>
        <span className="brand-rip">RIP</span>
        <span className="brand-bar" />
        <span className="brand-app">Igor</span>
        <span className="brand-sub">Sign-up rules lab</span>
      </a>
      <nav aria-label="Lab steps">
        <ol className="steps">
          {STEPS.map((s) => {
            const current = s.n === step;
            const open = s.n <= Math.max(reached, step);
            const body = (
              <>
                <span className="n">{s.n}</span>
                <span className="steps-text">
                  {s.label}
                  <small>{s.hint}</small>
                </span>
              </>
            );
            return (
              <li key={s.n} aria-current={current ? "step" : undefined} data-done={s.n < step}>
                {open && !current ? <a href={href(s.to)}>{body}</a> : <span className="steps-static" aria-disabled={!open}>{body}</span>}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="chips">
        {LANDING && (
          <a className="crypt-link" href={LANDING}>
            ← All labs
          </a>
        )}
        {step > 1 && (
          <>
            <span className="chip mono">seed {seed}</span>
            <span className="chip">
              {activeRules.name} · {activeRules.rules.length + (buried ? 1 : 0)} rules
            </span>
          </>
        )}
        <a className="crypt-link" href={href({ screen: "crypt" })}>
          <IconGrave />
          Crypt
        </a>
      </div>
    </header>
  );
}
