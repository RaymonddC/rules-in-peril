import { useState, type CSSProperties } from "react";
import { Header } from "../components/Header";
import { IconDownload } from "../components/Icons";
import { NextStep } from "../components/NextStep";
import { Term } from "../components/Term";
import { useLab, useRun } from "../lab/lab-state";
import { href } from "../lab/route";
import type { CryptEntry, LabRun } from "../lab/types";

const SHOWN = 16;

// Saving happens in this tab: a Blob and a temporary link. Nothing is sent anywhere.
function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// TODO(engine): the crypt format is set by the crypt-and-cli spec. This is a stand-in.
function cryptJson(run: LabRun, fixRule: string) {
  return JSON.stringify(
    { note: "Sample crypt from the Igor screens. Not the crypt-and-cli format.", seed: run.seed, pack: run.packId, fix: fixRule, monsters: run.crypt },
    null,
    2,
  );
}

function reportMd(run: LabRun, fixRule: string, villagersReview: number) {
  const t = run.totals;
  return [
    "# RIP report (sample)",
    "",
    `Seed ${run.seed} · pack ${run.packId} · fix: \`${fixRule}\``,
    "",
    `- ${run.crypt.length} of ${run.crypt.length} crypt monsters still caught`,
    `- 0 monsters walk in ${t.applicants} applicants`,
    `- villagers: ${t.villagersRejected} rejected, ${villagersReview} in review`,
    "",
  ].join("\n");
}

export function CryptScreen() {
  const run = useRun();
  const lab = useLab();
  const [removed, setRemoved] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fix = run.fixes.find((f) => f.id === lab.chosenFixId);

  if (!lab.buried || !fix) {
    return (
      <>
        <Header step={4} />
        <main className="page">
          <section className="card stack" style={{ gap: 16 }}>
            <p className="kicker">The crypt</p>
            <h1 className="title">The crypt is empty.</h1>
            <p className="lede">Monsters are buried here once you pick a fix that stops them. Each one then becomes a test.</p>
            <a className="btn btn-night" style={{ alignSelf: "flex-start" }} href={href({ screen: lab.run ? "close-the-gap" : "start" })}>
              {lab.run ? "Close the gap" : "Start a run"}
            </a>
          </section>
        </main>
      </>
    );
  }

  // Which monsters rise if the fix is taken out: the ones the fix catches.
  // TODO(engine): ask core to re-run the crypt without the fix.
  const rises = (m: CryptEntry) => removed && m.pattern === "Borrowed number";
  const risen = run.crypt.filter(rises);
  const shown = showAll ? run.crypt : run.crypt.slice(0, SHOWN);
  const review = run.totals.villagersReview + fix.villagersReviewDelta;

  const cli = removed
    ? [
        "$ npm run report",
        `  rules/${run.packId}.json · seed ${run.seed}`,
        `✗ ${risen.length} of ${run.crypt.length} crypt monsters walk again: ${risen.map((m) => "#" + m.monsterId).join(" ")}`,
        "  blind spot: registry · no rule reads it",
        "✗ exit 1",
      ]
    : [
        "$ npm run report",
        `  rules/${run.packId}.json + fix ${fix.id} · seed ${run.seed}`,
        `✓ ${run.crypt.length} of ${run.crypt.length} crypt monsters still caught`,
        `✓ 0 monsters walk in ${run.totals.applicants.toLocaleString("en-US")} applicants`,
        `  villagers: ${run.totals.villagersRejected + fix.villagersRejectedDelta} rejected · ${review} in review`,
        "✓ reports/latest.md written · exit 0",
      ];

  return (
    <>
      <Header step={4} />
      <main className="page" style={{ gap: 32 }}>
        <section className="section-head" style={{ alignItems: "flex-end", gap: 20 }}>
          <div className="stack" style={{ flex: "999 1 520px", minWidth: 0 }}>
            <p className="kicker">The crypt</p>
            <h1 className="title" aria-live="polite">
              {removed ? `${risen.length} monsters rose from the crypt.` : `${run.crypt.length} monsters buried. All still caught.`}
            </h1>
            <p className="lede">
              Every caught monster now lives in the <Term word="crypt" /> as a test. Whenever a rule changes, each one is sent back
              through. If one walks in again, the check fails before the change ships.
            </p>
          </div>
          <button type="button" className={removed ? "btn btn-night" : "btn btn-quiet"} aria-pressed={removed} onClick={() => setRemoved(!removed)}>
            {removed ? `Put fix ${fix.id} back` : `Try it: remove fix ${fix.id}`}
          </button>
        </section>

        <section aria-label="Buried monsters" className="yard">
          <ul className="stones">
            {shown.map((m, i) => {
              const up = rises(m);
              return (
                <li key={m.monsterId} style={{ "--i": i } as CSSProperties}>
                  <div className="stone" data-risen={up}>
                    <small>{up ? "RISEN" : "HERE LIES"}</small>
                    <strong>#{m.monsterId}</strong>
                    <span>{m.stitches} stitches</span>
                  </div>
                  <span className="stone-caption" data-risen={up}>
                    {up ? "Walks again" : "Still caught"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="ground" />
          <p style={{ margin: 0, padding: "12px 0 16px", fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>
            Showing {shown.length} of {run.crypt.length} ·{" "}
            <button type="button" onClick={() => setShowAll(!showAll)} style={{ background: "none", border: "none", padding: 0, color: "var(--ember-text)", textDecoration: "underline", cursor: "pointer" }}>
              {showAll ? "show fewer" : "see all"}
            </button>
          </p>
        </section>

        <section className="row" style={{ alignItems: "stretch" }}>
          <div className="main card-night stack" style={{ gap: 12 }}>
            <div className="section-head">
              <h2 style={{ fontSize: 18 }}>Same check, in your terminal and CI</h2>
              <button
                type="button"
                className="btn"
                style={{ minHeight: 36, padding: "0 12px", border: "1px solid #4A4552", background: "transparent", color: "var(--on-night)", fontFamily: "var(--font)", fontSize: 13, fontWeight: 500 }}
                onClick={() => void navigator.clipboard?.writeText("npm run report")}
              >
                Copy command
              </button>
            </div>
            <pre className="terminal">{cli.join("\n")}</pre>
            <p className="muted" style={{ fontSize: 13 }}>
              A Kiro hook runs this every time a rule pack in rules/ is saved. GitHub Actions runs it on every pull request.
            </p>
          </div>

          <div className="side card stack" style={{ gap: 14 }}>
            <h2 style={{ fontSize: 18 }}>Take the crypt with you</h2>
            <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
              {run.crypt.length} monsters, the seed and the rules they were caught with.
            </p>
            <button type="button" className="btn btn-night" onClick={() => save("crypt.json", cryptJson(run, fix.ruleCode), "application/json")}>
              <IconDownload />
              Download crypt.json
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => save("latest.md", reportMd(run, fix.ruleCode, review), "text/markdown")}>
              Download report.md
            </button>
            <a href={href({ screen: "start" })} style={{ fontSize: 14, fontWeight: 600 }}>
              Start a new run
            </a>
          </div>
        </section>
      </main>

      <NextStep
        label={removed ? "See it fail" : "Try it yourself"}
        action={{ text: removed ? `Put fix ${fix.id} back` : `Remove fix ${fix.id}`, onClick: () => setRemoved(!removed) }}
      >
        {removed
          ? `Without fix ${fix.id}, ${risen.length} buried monsters walk in again and the check fails. Put it back to bury them.`
          : `Take fix ${fix.id} out and watch the crypt catch the change.`}
      </NextStep>
    </>
  );
}
