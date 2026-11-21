import { useMemo, useState, type CSSProperties } from "react";
import { Header } from "../components/Header";
import { IconCheck, IconGhost } from "../components/Icons";
import { NextStep } from "../components/NextStep";
import { Term } from "../components/Term";
import { useLab, useRun } from "../lab/lab-state";
import { useProgress, useReducedMotion } from "../lab/motion";
import { href } from "../lab/route";
import { REJECT_PROMISE } from "../lab/sample-run";
import type { MemberMark } from "../lab/types";

const MARK_CLASS: Record<MemberMark, string> = {
  "monster-walked": "m-walked",
  "monster-caught": "m-caught",
  "villager-rejected": "m-rejected",
  "villager-review": "m-review",
  "villager-approved": "m-approved",
};

// The dots animate in CSS with a 2.2ms step each (motion.css). The counters
// follow the same clock so they land together.
const DOT_STEP_MS = 2.2;

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;

export function LabScreen() {
  const run = useRun();
  const lab = useLab();
  const reduce = useReducedMotion();
  const t = run.totals;
  const runMs = Math.round(run.marks.length * DOT_STEP_MS + 240);

  const [playKey, setPlayKey] = useState(0);
  const [playing, setPlaying] = useState(() => lab.playAttack && !reduce);
  const finish = () => {
    setPlaying(false);
    lab.attackPlayed();
  };
  const p = useProgress(playing, runMs, finish);

  // Running totals at each applicant, so the counters can follow the dots.
  const cumulative = useMemo(() => {
    const acc = { walked: 0, caught: 0, rejected: 0, review: 0 };
    return run.marks.map((m) => {
      if (m === "monster-walked") acc.walked++;
      else if (m === "monster-caught") acc.caught++;
      else if (m === "villager-rejected") acc.rejected++;
      else if (m === "villager-review") acc.review++;
      return { ...acc };
    });
  }, [run.marks]);

  const seen = playing ? Math.min(Math.floor(p * run.marks.length), run.marks.length) : run.marks.length;
  const now = (seen > 0 ? cumulative[seen - 1] : undefined) ?? { walked: 0, caught: 0, rejected: 0, review: 0 };
  const done = !playing;

  const keepsPromise = t.villagersRejected / t.villagers <= REJECT_PROMISE;
  const maxHits = Math.max(...run.hits.map((h) => Math.max(h.monstersCaught, h.villagersHit)), 1);
  const ruleNumber = (id: string) => run.hits.findIndex((h) => h.ruleId === id) + 1;
  const smallest = run.walkers[0];

  function replay() {
    setPlayKey((k) => k + 1);
    setPlaying(!reduce);
  }

  return (
    <>
      <Header step={2} />
      <main className="page">
        {lab.isSampleStandIn && (
          <p className="notice" role="status">
            The engine isn’t wired in yet, so this shows the sample run: seed 1818 with the starter fintech pack.
          </p>
        )}

        <section className="stack" style={{ gap: 14 }}>
          <p className="kicker">Step 2 · Attack</p>
          <h1 className="title" aria-live="polite">
            {done ? (
              <>
                <span style={{ color: "var(--ember-strong)" }}>{t.walked} monsters</span> walked in.
              </>
            ) : (
              <>Sending applicants through your rules…</>
            )}
          </h1>
          {done ? (
            <p className="lede">
              Of {t.monsters} fake applicants, {t.walked} were approved by your {run.hits.length} rules. Along the way,{" "}
              {t.villagersRejected} honest people were turned away and {t.villagersReview} were held for review.
            </p>
          ) : (
            <div className="run-status">
              <span className="mono tabular" style={{ minWidth: 190 }}>
                Applicant {seen.toLocaleString("en-US")} of {run.marks.length.toLocaleString("en-US")}
              </span>
              <span className="run-track" aria-hidden="true">
                <span style={{ transform: `scaleX(${p})` }} />
              </span>
              <button type="button" className="linkish" onClick={finish}>
                Skip to the result
              </button>
            </div>
          )}
        </section>

        <section aria-label="Run totals" className="grid-4">
          <div className="stat stat-night">
            <span className="label">
              <span className="swatch m-walked" />
              <Term word="walk">Walked in</Term>
            </span>
            <span className="big tabular">{now.walked}</span>
            <span className="foot">fake applicants approved</span>
          </div>
          <div className="stat">
            <span className="label">
              <span className="swatch m-caught" />
              Caught
            </span>
            <span className="big tabular">{now.caught}</span>
            <span className="foot">fakes rejected or sent to review</span>
          </div>
          <div className="stat">
            <span className="label">
              <span className="swatch m-rejected" />
              <span>
                <Term word="villager">Villagers</Term> turned away
              </span>
            </span>
            <span className="big tabular">{now.rejected}</span>
            <span className="foot" style={{ display: "flex", alignItems: "center", gap: 6, color: done ? (keepsPromise ? "var(--ok)" : "#8A3A10") : undefined }}>
              {done && keepsPromise && <IconCheck color="currentColor" />}
              {done ? `${pct(t.villagersRejected, t.villagers)} · ${keepsPromise ? "promise is at most 1%" : "breaks the 1% promise"}` : "honest people rejected"}
            </span>
          </div>
          <div className="stat">
            <span className="label">
              <span className="swatch m-review" />
              Sent to review
            </span>
            <span className="big tabular">{now.review}</span>
            <span className="foot">honest people held for a human</span>
          </div>
        </section>

        <section aria-labelledby="world" className="card stack" style={{ gap: 14 }}>
          <div className="section-head">
            <h2 id="world">
              The world of <Term word="seed">seed</Term> {run.seed}
            </h2>
            {done && (
              <button type="button" className="linkish" onClick={replay}>
                Replay the attack
              </button>
            )}
          </div>
          <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
            Each square is one applicant. <strong style={{ color: "var(--ember-strong)" }}>Orange squares</strong> are monsters your
            rules let in.
          </p>
          <div
            key={playKey}
            className="field"
            data-playing={playing}
            role="img"
            aria-label={`${t.applicants} applicants: ${t.walked} monsters walked, ${t.caught} caught, ${t.villagersRejected} villagers rejected, ${t.villagersReview} in review, ${t.villagers - t.villagersRejected - t.villagersReview} approved`}
          >
            {run.marks.map((m, i) => (
              <span key={i} className={MARK_CLASS[m]} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
          <ul className="legend">
            <li><span className="swatch m-walked" />Monster walked in</li>
            <li><span className="swatch m-caught" />Monster caught</li>
            <li><span className="swatch m-rejected" />Villager, rejected</li>
            <li><span className="swatch m-review" />Villager, in review</li>
            <li><span className="swatch m-approved" />Villager, approved</li>
          </ul>
        </section>

        {done && (
          <section className="row">
            <div className="main stack" style={{ gap: 14 }}>
              <div className="section-head">
                <h2>Who walked in</h2>
                <span className="hint">Fewest fake parts first. Click one to see how it got in.</span>
              </div>
              <ul className="walkers stagger">
                {run.walkers.map((w, i) => (
                  <li key={w.monsterId} style={{ "--i": i } as CSSProperties}>
                    <a className="walker" href={href({ screen: "autopsy", monsterId: w.monsterId })}>
                      <IconGhost />
                      <span className="who">
                        <strong>Monster #{w.monsterId}</strong>
                        <span className="hint">
                          {w.stitchesBefore} fake parts → {w.stitchesAfter}
                        </span>
                      </span>
                      <span className="what">
                        <strong style={{ color: "var(--ink)" }}>{w.pattern}</strong> · {w.summary}
                      </span>
                      <span className="go">Autopsy →</span>
                    </a>
                  </li>
                ))}
              </ul>
              {run.walkers.length < t.walked && (
                <p className="hint">
                  Showing {run.walkers.length} of {t.walked} walkers.
                </p>
              )}
            </div>

            <div className="side stack" style={{ gap: 24 }}>
              <div className="card stack" style={{ gap: 14 }}>
                <h2 style={{ fontSize: 20 }}>Which rule caught whom</h2>
                <p className="hint" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span className="swatch m-caught" /> monsters caught
                  <span className="swatch m-rejected" style={{ marginLeft: 8 }} /> villagers hit
                </p>
                <ul className="hits">
                  {run.hits.map((h, i) => (
                    <li key={h.ruleId}>
                      <span className="line">
                        <span>
                          <span className="mono" style={{ color: "var(--ink-3)" }}>R{ruleNumber(h.ruleId)}</span> {h.short}
                        </span>
                        <span className="mono" style={{ color: "var(--ink-2)" }}>
                          {h.monstersCaught} · {h.villagersHit}
                        </span>
                      </span>
                      <span className="bars" aria-hidden="true">
                        <span className="m-caught" style={{ width: `${(h.monstersCaught / maxHits) * 100}%`, "--i": i } as CSSProperties} />
                        <span className="m-rejected" style={{ width: `${(h.villagersHit / maxHits) * 100}%`, "--i": i } as CSSProperties} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-night stack" style={{ gap: 12 }}>
                <h2 style={{ fontSize: 18 }}>Checked on this run</h2>
                <ul className="checks">
                  <li><IconCheck />Same seed, same report</li>
                  <li><IconCheck />Every verdict names the rule that fired</li>
                  <li><IconCheck />Every walker is cut down until one more cut gets it caught</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      {done && smallest && (
        <NextStep label="Next · Step 3" action={{ text: `Shrink monster #${smallest.monsterId}`, href: href({ screen: "autopsy", monsterId: smallest.monsterId }) }}>
          Monster #{smallest.monsterId} got in with just {smallest.stitchesAfter} fake parts. See which ones, and what your rules missed.
        </NextStep>
      )}
    </>
  );
}
