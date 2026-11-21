import { Header } from "../components/Header";
import { NextStep } from "../components/NextStep";
import { Term } from "../components/Term";
import { useLab, useRun } from "../lab/lab-state";
import { useCountUp } from "../lab/motion";
import { go, href } from "../lab/route";
import { REJECT_PROMISE } from "../lab/sample-run";
import type { Fix } from "../lab/types";

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
// The price bar spans 0–10% of villagers, so the 1% promise sits at a tenth.
const BAR_MAX = 0.1;

function CountedPick({ fix, villagers, rejectedToday }: { fix: Fix; villagers: number; rejectedToday: number }) {
  const walk = useCountUp(fix.monstersWalk);
  const rej = useCountUp(rejectedToday + fix.villagersRejectedDelta);
  const rev = useCountUp(fix.villagersReviewDelta);
  return (
    <span className="tabular">
      With fix {fix.id}: <strong>{walk}</strong> monsters walk · <strong>{rej}</strong> villagers rejected in all (
      {((rej / villagers) * 100).toFixed(1)}%) · <strong>{signed(rev)}</strong> sent to review
    </span>
  );
}

export function CloseGapScreen() {
  const run = useRun();
  const lab = useLab();
  const t = run.totals;
  const chosen = run.fixes.find((f) => f.id === lab.chosenFixId) ?? run.fixes[0];
  const blind = run.autopsies[17]?.blindSpot.signal ?? "the blind spot";

  const rejectedAfter = (f: Fix) => t.villagersRejected + f.villagersRejectedDelta;
  const keeps = (f: Fix) => rejectedAfter(f) / t.villagers <= REJECT_PROMISE;
  const verdict = (f: Fix) =>
    f.monstersWalk > 0
      ? { text: `${f.monstersWalk} still walk`, cls: "pill-warn" }
      : !keeps(f)
        ? { text: "Turns away too many", cls: "pill-review" }
        : { text: "Stops all, keeps the promise", cls: "pill-ok" };
  const usable = chosen ? chosen.monstersWalk === 0 : false;

  return (
    <>
      <Header step={4} />
      <main className="page" style={{ gap: 32 }}>
        <a className="back" href={href({ screen: "autopsy", monsterId: 17 })}>
          ← Back to the autopsy of #17
        </a>

        <section className="stack">
          <p className="kicker">Step 4 · Patch</p>
          <h1 className="title">Close the gap. See what it costs.</h1>
          <p className="lede">
            A fix is one new rule. Each one below was re-run on the same {t.applicants.toLocaleString("en-US")} applicants. Its
            price is the honest <Term word="villager">villagers</Term> it turns away. Pick one.
          </p>
        </section>

        <section
          aria-label="Today, before any fix"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 32px", padding: "16px 20px", borderRadius: 14, border: "1px dashed var(--line-strong)" }}
        >
          <strong>Today, no fix</strong>
          <span>
            <strong style={{ color: "var(--ember-strong)" }}>{t.walked}</strong> monsters walk
          </span>
          <span>
            <strong>{t.villagersRejected}</strong> villagers rejected · {((t.villagersRejected / t.villagers) * 100).toFixed(1)}%
          </span>
          <span>
            <strong>{t.villagersReview}</strong> villagers in review
          </span>
        </section>

        <section aria-label="Fixes" className="grid-3">
          {run.fixes.map((f) => {
            const v = verdict(f);
            const share = rejectedAfter(f) / t.villagers;
            return (
              <button key={f.id} type="button" className="choice" style={{ gap: 16 }} aria-pressed={f.id === lab.chosenFixId} onClick={() => lab.setChosenFixId(f.id)}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge">{f.id}</span>
                    <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{f.title}</strong>
                  </span>
                </span>
                <span className="fix-code">
                  {f.placement}
                  {"\n"}
                  {f.ruleCode}
                </span>
                <span className="fix-nums">
                  <span>
                    <span className="v" style={{ display: "block", color: f.monstersWalk > 0 ? "var(--ember-strong)" : "var(--ok)" }}>
                      {f.monstersWalk}
                    </span>
                    <span className="k">monsters still walk</span>
                  </span>
                  <span>
                    <span className="v" style={{ display: "block" }}>{signed(f.villagersRejectedDelta)}</span>
                    <span className="k">more villagers rejected</span>
                  </span>
                  <span>
                    <span className="v" style={{ display: "block" }}>{signed(f.villagersReviewDelta)}</span>
                    <span className="k">more sent to review</span>
                  </span>
                </span>
                <span className="stack" style={{ gap: 6 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
                    <span>Villagers rejected in all: {(share * 100).toFixed(1)}%</span>
                    <span>1% promise</span>
                  </span>
                  <span className="price-bar" aria-hidden="true">
                    <span style={{ background: keeps(f) ? "var(--borrowed)" : "var(--invented)", transform: `scaleX(${Math.min(share / BAR_MAX, 1)})` }} />
                    <span className="limit" style={{ left: `${(REJECT_PROMISE / BAR_MAX) * 100}%` }} />
                  </span>
                </span>
                <span className={`pill ${v.cls}`} style={{ alignSelf: "flex-start", whiteSpace: "normal" }}>
                  {v.text}
                </span>
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{f.note}</span>
              </button>
            );
          })}
        </section>
      </main>

      {chosen && (
        <NextStep
          label={usable ? `Next · Apply fix ${chosen.id}` : `Fix ${chosen.id} leaves monsters walking`}
          action={{
            text: `Apply and bury ${t.walked} monsters`,
            disabled: !usable,
            onClick: () => {
              lab.bury();
              go({ screen: "crypt" });
            },
          }}
        >
          <CountedPick fix={chosen} villagers={t.villagers} rejectedToday={t.villagersRejected} />
          {!usable && <span className="hint"> Pick a fix that stops every monster to close the gap on <span className="mono">{blind}</span>.</span>}
        </NextStep>
      )}
    </>
  );
}
