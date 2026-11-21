import { useEffect, useRef, useState } from "react";
import { NextStep, Term } from "../components/Guide";
import { Header } from "../components/Header";
import { money, sampleRun } from "../lab/sample-run";

type Check = { id: string; text: string; result: string; kind: "approve" | "unread" | "quiet" };

export function ReplayScreen() {
  const b = sampleRun.breach;
  const last = b.actions.length; // step 0 is "before the first action"
  // Plays once on arrival, from before the first action, so you watch the
  // total climb. Under reduced motion it opens on the last step instead.
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [step, setStep] = useState(reduce ? last : 0);
  const [playing, setPlaying] = useState(!reduce);
  const timer = useRef<number | null>(null);

  const totals = [0, ...b.actions.map((_, i) => b.actions.slice(0, i + 1).reduce((s, a) => s + a.amount, 0))];
  const total = totals[step] ?? 0;
  const scaleMax = 2000;
  const breached = total > b.harmLine;
  const action = step > 0 ? b.actions[step - 1] : undefined;

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= last) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1100);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [playing, last]);

  function play() {
    if (playing) return setPlaying(false);
    if (step >= last) setStep(0);
    setPlaying(true);
  }
  const goTo = (n: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(last, n)));
  };

  const checks: Check[] = sampleRun.guardrails.map((g) => {
    if (!action) return { id: g.id, text: g.plain, result: "Not checked", kind: "quiet" };
    if (g.id === "G1") return { id: g.id, text: g.plain, result: `Allowed · ${money(action.amount)}`, kind: "approve" };
    if (g.id === "G6") return { id: g.id, text: g.plain, result: `Allowed · action ${step}`, kind: "approve" };
    return { id: g.id, text: g.plain, result: "Not a match", kind: "quiet" };
  });
  checks.push({ id: "—", text: "Nothing reads runningTotal", result: action ? `Unread · ${money(total)}` : "Unread", kind: "unread" });

  const labelFor = (i: number) => (i === 0 ? "task starts" : `${b.actions[i - 1]?.call} ${money(b.actions[i - 1]?.amount ?? 0)}`);

  return (
    <>
      <Header step={3} />
      <main className="page" style={{ gap: 28 }}>
        <a className="back" href="#/">
          ← Back to the circle
        </a>

        <section className="section-head" style={{ alignItems: "flex-end", gap: 20 }}>
          <div className="stack" style={{ flex: "999 1 520px", minWidth: 0, gap: 10 }}>
            <p className="kicker">Breach replay · task #{b.taskId}</p>
            <h1 className="title" style={{ fontSize: "clamp(32px, 4.5vw, 48px)" }}>
              Four small refunds. Every guardrail said yes.
            </h1>
            <p style={{ fontSize: 17, color: "var(--ink-2)" }}>
              The smallest attack found by the search: {b.actions.length} actions, down from {b.actionsBefore}. Each refund is small
              enough for G1, but together they cross the <Term word="harm line" /> of {money(b.harmLine)}. Drop any one refund and the
              total stays under it.
            </p>
          </div>
          <div role="group" aria-label="Replay controls" style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-icon" aria-label="Previous step" onClick={() => goTo(step - 1)} disabled={step === 0}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button type="button" className="btn btn-ember" style={{ minWidth: 120 }} onClick={play}>
              {playing ? "Pause" : step >= last ? "Replay" : "Play"}
            </button>
            <button type="button" className="btn btn-icon" aria-label="Next step" onClick={() => goTo(step + 1)} disabled={step === last}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </section>

        <section aria-label="Timeline" className="card">
          <ol className="timeline">
            {totals.map((tot, i) => (
              <li key={i}>
                {i > 0 && <span className="link" data-done={i <= step} />}
                <button
                  type="button"
                  data-done={i <= step}
                  aria-current={i === step ? "step" : undefined}
                  aria-label={`Step ${i}: ${labelFor(i)}`}
                  onClick={() => goTo(i)}
                >
                  {i}
                </button>
                <span className="short">{labelFor(i)}</span>
                <span className="total" data-done={i <= step}>
                  {money(tot)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="row">
          <div className="card stack" style={{ flex: "999 1 520px", minWidth: 0, gap: 14 }}>
            <div className="section-head">
              <h2 style={{ fontSize: 20 }}>{action ? `Refund ${step} of ${last}` : "Before the first action"}</h2>
              <span className="hint">
                Step {step} of {last}
              </span>
            </div>
            <pre className="code" style={{ margin: 0, fontSize: 13, padding: "14px 16px" }}>
              {action
                ? `${action.call}(order: "${b.orderId}", amount: ${action.amount})`
                : `// task #${b.taskId} · order ${b.orderId} · runningTotal = 0`}
            </pre>
            <h3 style={{ fontSize: 14, fontFamily: "var(--font)", fontWeight: 600, color: "var(--ink-2)", marginTop: 6 }}>What the ring checked</h3>
            <ul className="checks" aria-live="polite">
              {checks.map((c) => (
                <li key={c.id}>
                  <span className="mono" style={{ width: 28, fontSize: 12, color: "var(--ink-3)" }}>{c.id}</span>
                  <span style={{ flex: 1 }}>{c.text}</span>
                  <span className={`pill ${c.kind === "approve" ? "pill-approve" : c.kind === "unread" ? "pill-unread" : "pill-quiet"}`}>{c.result}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="stack" style={{ flex: "1 1 340px", gap: 16 }}>
            <div className="card stack" style={{ gap: 14 }}>
              <h2 style={{ fontSize: 18 }}>Money out, this task</h2>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 44, color: "var(--ember-text)" }}>{money(total)}</span>
              <div
                className="meter"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={scaleMax}
                aria-valuenow={total}
                aria-label={`Money out: ${money(total)} of a ${money(b.harmLine)} harm line`}
              >
                <span className="fill" style={{ transform: `scaleX(${total / scaleMax})` }} />
                <span className="harm" style={{ left: `${(b.harmLine / scaleMax) * 100}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
                <span>$0</span>
                <span>Harm line · {money(b.harmLine)}</span>
                <span>{money(scaleMax)}</span>
              </div>
              <p style={{ padding: 12, borderRadius: 10, background: "var(--raised)", fontSize: 14, color: "#E4DEEC" }}>
                Three refunds ({money(499 * 3)}) stay under the harm line. Asked as one {money(2000)} refund, G1 blocks it on the spot.
              </p>
            </div>

            {breached && (
              <div className="breach" role="status">
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Breach</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, lineHeight: 1.25 }}>
                  {money(total)} out on one task, past the harm line. Every action was allowed.
                </span>
                <span style={{ fontSize: 14 }}>
                  <Term word="blind spot">Blind spot</Term>: <span className="mono">{b.blindSpot}</span>. No guardrail reads it.
                </span>
              </div>
            )}
          </div>
        </section>
      </main>

      {breached && (
        <NextStep label="Next · Step 4" action={{ text: "Close the circle", href: "#/fixes" }}>
          Pick a fix that reads <span className="mono">{b.blindSpot}</span>, and see how many real tasks it blocks.
        </NextStep>
      )}
    </>
  );
}
