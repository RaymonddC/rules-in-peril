import { useState } from "react";
import { NextStep, Term } from "../components/Guide";
import { Header } from "../components/Header";
import { Ring } from "../components/Ring";
import { money, OUTCOME_WORD, sampleRun } from "../lab/sample-run";
import type { Fix } from "../lab/types";

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The ring draws itself the first time you open the circle in a session.
let ringPlayed = false;

export function CircleScreen() {
  const run = sampleRun;
  const t = run.totals;
  const b = run.breach;
  const [pick, setPick] = useState<Fix["id"]>("B");
  const [play, setPlay] = useState(() => {
    const first = !ringPlayed && !reduceMotion();
    ringPlayed = true;
    return first;
  });
  const [ringKey, setRingKey] = useState(0);

  return (
    <>
      <Header step={2} />
      <main className="page">
        <section className="stack">
          <p className="kicker">The circle</p>
          <h1 className="title">
            <span style={{ color: "var(--ember-text)" }}>{t.walked} monsters</span> walked through your guardrails.
          </h1>
          <p className="lede">
            A support-desk agent ran {t.tasks} tasks from <Term word="seed">seed</Term> {run.seed}: {t.villagers} real ones (
            <Term word="villager">villagers</Term>) and {t.monsters} attacks (<Term word="monster">monsters</Term>). Each{" "}
            <Term word="guardrail" /> checks one action at a time, so an attack split into small steps can slip through.
          </p>
        </section>

        <section className="row" style={{ gap: 28 }}>
          <figure className="card stack" style={{ flex: "1 1 460px", margin: 0, gap: 14, borderRadius: 20 }}>
            <Ring key={ringKey} play={play} guardrailIds={run.guardrails.map((g) => g.id)} caught={t.caught} walked={t.walked} breachSteps={b.actions.length} />
            <figcaption className="stack" style={{ gap: 10 }}>
              <ul className="read">
                <li><span className="dot" style={{ background: "var(--salt)" }} />The white ring is your guardrails. G1 to G6 mark each one.</li>
                <li><span className="dot" style={{ background: "var(--ash)" }} />Grey dots are attacks stopped at the ring.</li>
                <li><span className="dot" style={{ background: "var(--ember)" }} />Orange dots got through. The dashed line is the smallest one.</li>
              </ul>
              {!reduceMotion() && (
                <button type="button" className="btn btn-dark" style={{ alignSelf: "flex-start", minHeight: 40, fontSize: 14, border: "1px solid var(--line-strong)" }} onClick={() => { setPlay(true); setRingKey((k) => k + 1); }}>
                  Draw it again
                </button>
              )}
              <ul className="legend">
                <li><span className="dot" style={{ background: "var(--salt)" }} />Guardrail ring</li>
                <li><span className="dot" style={{ background: "var(--ash)" }} />Caught · {t.caught}</li>
                <li><span className="dot" style={{ background: "var(--ember)" }} />Walked · {t.walked}</li>
              </ul>
            </figcaption>
          </figure>

          <div className="stack" style={{ flex: "999 1 480px", minWidth: 0, gap: 20 }}>
            <div className="stats">
              <div className="stat stat-hot">
                <span className="label">Walked</span>
                <span className="big">{t.walked}</span>
                <span className="foot">of {t.monsters} monsters</span>
              </div>
              <div className="stat">
                <span className="label">Villagers blocked</span>
                <span className="big">{t.villagersBlocked}</span>
                <span className="foot">of {t.villagers} · {pct(t.villagersBlocked, t.villagers)}</span>
              </div>
              <div className="stat">
                <span className="label">Villagers sent to a human</span>
                <span className="big">{t.villagersAsked}</span>
                <span className="foot">of {t.villagers} · {pct(t.villagersAsked, t.villagers)}</span>
              </div>
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <div className="section-head">
                <h2 style={{ fontSize: 20 }}>The ring</h2>
                <span className="hint">monsters caught / villagers hit</span>
              </div>
              <ol className="list-box">
                {run.guardrails.map((g) => (
                  <li key={g.id}>
                    <span className="gid">{g.id}</span>
                    <span className="gt">
                      <span>{g.plain}</span>
                      <code>{g.code}</code>
                    </span>
                    <span className={`pill pill-${g.then}`}>{OUTCOME_WORD[g.then]}</span>
                    <span className="hits">
                      {g.monstersCaught} / {g.villagersHit}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="paper stack" style={{ gap: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#A8481A" }}>
                Smallest found by the search · {b.actions.length} actions, down from {b.actionsBefore}
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, lineHeight: 1.2 }}>
                {b.actions.length} {money(b.actions[0]?.amount ?? 0)} refunds on one order, instead of one {money(2000)} refund.
              </span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {b.actions.map((a, i) => (
                  <span key={i} className="mono" style={{ padding: "8px 12px", borderRadius: 10, background: "#FBE1D0", fontSize: 14 }}>
                    {a.call} {money(a.amount)}
                  </span>
                ))}
              </span>
              <span style={{ fontSize: 14, color: "#4A4552" }}>
                Harm line: more than {money(b.harmLine)} out on one task. Blind spot: <span className="mono">{b.blindSpot}</span>. G1 reads one
                refund at a time, and no guardrail reads the running total.
              </span>
              <a className="btn btn-dark" href="#/replay" style={{ alignSelf: "flex-start" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4l13 8-13 8z" />
                </svg>
                Replay the breach
              </a>
            </div>
          </div>
        </section>

        <section id="fixes" aria-labelledby="fixes-title" className="stack" style={{ gap: 14 }}>
          <div className="section-head">
            <h2 id="fixes-title" style={{ fontSize: 24 }}>Close the circle</h2>
            <span className="hint">Price = villager tasks blocked or sent to a human</span>
          </div>
          <p style={{ color: "var(--ink-2)", maxWidth: 760 }}>
            Each fix is one guardrail change, re-run on the same {t.tasks} tasks. Pick the one that stops every attack while
            blocking the fewest real tasks.
          </p>
          <div className="fixes">
            {run.fixes.map((f) => (
              <button key={f.id} type="button" className="choice" aria-pressed={pick === f.id} onClick={() => setPick(f.id)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="badge">{f.id}</span>
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>{f.title}</strong>
                </span>
                <span className="code">{f.ruleCode}</span>
                <span className="nums">
                  <span>
                    <span className="v" style={{ color: f.monstersWalk > 0 ? "var(--ember-text)" : "#6FC39B" }}>{f.monstersWalk}</span>
                    <span className="k">still walk</span>
                  </span>
                  <span>
                    <span className="v">{signed(f.villagersBlockedDelta)}</span>
                    <span className="k">more villagers blocked</span>
                  </span>
                  <span>
                    <span className="v">{signed(f.villagersAskedDelta)}</span>
                    <span className="k">more sent to a human</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <NextStep label="Next · Step 3" action={{ text: "Replay the breach", href: "#/replay" }}>
        Watch the smallest attack pass every guardrail, one refund at a time.
      </NextStep>
    </>
  );
}
