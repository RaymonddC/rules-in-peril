import { sampleRun } from "../lab/sample-run";

type Step = 1 | 2 | 3 | 4;

/** The RIP front door. Set only in the combined site build (build-site.mjs). */
const LANDING = import.meta.env.VITE_LANDING_URL;
const STEPS: { n: Step; label: string; hint: string; to: string }[] = [
  { n: 1, label: "Load", hint: "The guardrails", to: "#/" },
  { n: 2, label: "Attack", hint: "Who crossed", to: "#/" },
  { n: 3, label: "Shrink", hint: "Replay the breach", to: "#/replay" },
  { n: 4, label: "Patch", hint: "Close the circle", to: "#/fixes" },
];

export function Header({ step }: { step: Step }) {
  return (
    <header className="top">
      <a className="brand" href="#/">
        <span className="brand-rip">RIP</span>
        <span className="brand-bar" />
        <span className="brand-app">Salt Circle</span>
        <span className="brand-sub">AI-agent guardrails lab</span>
      </a>
      <nav aria-label="Lab steps">
        <ol className="steps">
          {STEPS.map((s) => {
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
              <li key={s.n} aria-current={s.n === step ? "step" : undefined}>
                {s.n === step ? <span>{body}</span> : <a href={s.to}>{body}</a>}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="chips">
        {LANDING && (
          <a className="chip" href={LANDING} style={{ color: "var(--ink)", textDecoration: "none" }}>
            ← All labs
          </a>
        )}
        <span className="chip mono">seed {sampleRun.seed}</span>
        <span className="chip">
          {sampleRun.packName} · {sampleRun.guardrails.length} guardrails
        </span>
      </div>
    </header>
  );
}
