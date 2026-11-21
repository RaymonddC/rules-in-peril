import { useEffect, useState, type CSSProperties } from "react";
import { BodyMap } from "../components/BodyMap";
import { Header } from "../components/Header";
import { NextStep } from "../components/NextStep";
import { Term } from "../components/Term";
import { useRun } from "../lab/lab-state";
import { useReducedMotion } from "../lab/motion";
import { href } from "../lab/route";

// One cut every 750ms: slow enough to read each line as it lands.
const CUT_EVERY_MS = 750;

export function AutopsyScreen({ monsterId }: { monsterId: number }) {
  const run = useRun();
  const reduce = useReducedMotion();
  const walker = run.walkers.find((w) => w.monsterId === monsterId);
  const autopsy = run.autopsies[monsterId];
  const total = autopsy?.cutOrder.length ?? 0;

  // The shrink plays once on arrival so you see it happen, then stays put.
  const [cuts, setCuts] = useState(() => (reduce ? total : 0));
  const [playing, setPlaying] = useState(() => !reduce && total > 0);

  useEffect(() => {
    if (!playing) return;
    if (cuts >= total) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setCuts((c) => c + 1), cuts === 0 ? 600 : CUT_EVERY_MS);
    return () => window.clearTimeout(id);
  }, [playing, cuts, total]);

  if (!walker || !autopsy) {
    return (
      <>
        <Header step={3} />
        <main className="page">
          <a className="back" href={href({ screen: "lab" })}>
            ← Back to the lab
          </a>
          <section className="card stack">
            <h1 style={{ fontSize: 32 }}>Monster #{monsterId}</h1>
            <p className="lede">
              {walker
                ? `${walker.pattern}: ${walker.summary}. The sample run only carries the full autopsy for monster #17. The others come from the engine once shrink-and-autopsy lands.`
                : "This monster did not walk in this run."}
            </p>
            <a className="btn btn-night" href={href({ screen: "autopsy", monsterId: 17 })} style={{ alignSelf: "flex-start" }}>
              Open monster #17
            </a>
          </section>
        </main>
      </>
    );
  }

  const cutParts = autopsy.cutOrder.slice(0, cuts);
  const left = autopsy.stitches.length - cuts;
  const finished = cuts >= total;
  const ruleCount = run.hits.length;

  const restart = () => {
    setCuts(0);
    setPlaying(!reduce);
    if (reduce) setCuts(total);
  };

  return (
    <>
      <Header step={3} />
      <main className="page" style={{ gap: 28 }}>
        <a className="back" href={href({ screen: "lab" })}>
          ← Back to the lab · {run.totals.walked} walkers
        </a>

        <section className="stack" style={{ gap: 10 }}>
          <p className="kicker">Step 3 · Shrink</p>
          <h1 className="title">Monster #{monsterId}: what did it really need?</h1>
          <p className="lede">
            It got in with {autopsy.stitches.length} fake parts. Igor <Term word="shrink">shrinks</Term> it: it cuts one{" "}
            <Term word="stitch" /> at a time and checks that it still walks in. What is left is all your rules missed.
          </p>
        </section>

        <section className="row" style={{ gap: 32 }}>
          <div className="card stack" style={{ flex: "1 1 440px", gap: 16, borderRadius: 20 }}>
            <div className="player" role="group" aria-label="Shrink playback">
              <span className="count" aria-live="polite">
                {left} {left === 1 ? "stitch" : "stitches"} left
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setCuts((c) => Math.max(c - 1, 0))} disabled={cuts === 0} aria-label="Undo one cut">
                ←
              </button>
              {finished ? (
                <button type="button" className="btn btn-night btn-sm" onClick={restart}>
                  Watch it again
                </button>
              ) : (
                <button type="button" className="btn btn-night btn-sm" onClick={() => setPlaying(!playing)}>
                  {playing ? "Pause" : cuts === 0 ? "Watch it shrink" : "Keep cutting"}
                </button>
              )}
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setCuts((c) => Math.min(c + 1, total))} disabled={finished} aria-label="Make the next cut">
                →
              </button>
            </div>
            <BodyMap stitches={autopsy.stitches} cut={cutParts} />
            <ul className="legend">
              <li><span className="swatch" style={{ width: 12, height: 12, background: "var(--borrowed)" }} />Borrowed from a real Vesper resident</li>
              <li><span className="swatch" style={{ width: 12, height: 12, background: "var(--invented)" }} />Invented</li>
              <li><span className="swatch" style={{ width: 12, height: 12, border: "2px dashed #B9AE9C" }} />Cut away</li>
            </ul>
          </div>

          <div className="stack" style={{ flex: "999 1 520px", minWidth: 0, gap: 22 }}>
            <div className="card stack" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>The cuts, one at a time</h2>
              <ol className="cut-list" style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 15, color: "var(--ink-2)" }}>
                {autopsy.cuts.map((c, i) => (
                  <li key={c} data-state={i < cuts - 1 ? "done" : i === cuts - 1 ? "now" : "todo"}>
                    {c}
                    {i < cuts && <span style={{ color: "var(--ok)", fontWeight: 600 }}> → still walks in</span>}
                  </li>
                ))}
              </ol>
            </div>

            {finished ? (
              <div className="stack stagger" style={{ gap: 22 }}>
                <div className="stack" style={{ "--i": 0 } as CSSProperties}>
                  <h2 style={{ fontSize: 20 }}>What is left: the smallest found by the search</h2>
                  <div className="grid-2">
                    {autopsy.coreCards.map((c) => (
                      <div key={c.title} className={`core-card core-${c.kind}`}>
                        <span className="kind">{c.kind}</span>
                        <strong>{c.title}</strong>
                        <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{c.body}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="stack" style={{ gap: 10, "--i": 1 } as CSSProperties}>
                  <h2 style={{ fontSize: 20 }}>Cut one more, and it gets caught</h2>
                  <ul className="list-box">
                    {autopsy.oneMoreCut.map((c) => (
                      <li key={c.caughtBy}>
                        <span style={{ flex: 1, minWidth: 220 }}>{c.drop}</span>
                        <span className="pill pill-reject">
                          Caught by {c.caughtBy} · <span className="mono">{c.ruleCode}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-night stack" style={{ gap: 12, borderRadius: 18, "--i": 2 } as CSSProperties}>
                  <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#F2A66E" }}>
                    Your blind spot
                  </p>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, lineHeight: 1.25 }}>
                    <span className="mono">
                      {autopsy.blindSpot.signal} = {autopsy.blindSpot.value}
                    </span>
                    , and none of your {ruleCount} rules reads {autopsy.blindSpot.signal}.
                  </p>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {autopsy.blindSpot.body} This is the smallest found by the search, not a proven minimum.
                  </p>
                </div>
              </div>
            ) : (
              <p className="card" style={{ color: "var(--ink-2)" }}>
                Keep cutting to see what is left, and which signal none of your rules reads.
              </p>
            )}
          </div>
        </section>
      </main>

      {finished && (
        <NextStep label="Next · Step 4" action={{ text: "Close the gap", href: href({ screen: "close-the-gap" }) }}>
          Try three fixes for <span className="mono">{autopsy.blindSpot.signal}</span> and see what each one costs honest people.
        </NextStep>
      )}
    </>
  );
}
