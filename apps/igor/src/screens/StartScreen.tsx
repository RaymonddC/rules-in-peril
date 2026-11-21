import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Header } from "../components/Header";
import { IconArrow, IconDownload, IconLock, IconUpload } from "../components/Icons";
import { NextStep } from "../components/NextStep";
import { RuleBuilder } from "../components/RuleBuilder";
import { RuleList } from "../components/RuleList";
import { Term } from "../components/Term";
import { HeroTombstone } from "../components/Tombstone";
import { exampleRulesText } from "../lab/example-rules";
import { useLab, type RuleSource } from "../lab/lab-state";
import { loadRulesFile } from "../lab/load-rules";
import { go } from "../lab/route";
import { starterDrafts, toRulesFile } from "../lab/rule-builder";
import { rulePacks } from "../lab/sample-run";
import { saveFile } from "../lab/save-file";

const SOURCES: { id: RuleSource; label: string }[] = [
  { id: "pack", label: "Use a ready-made pack" },
  { id: "build", label: "Write my own rules" },
  { id: "file", label: "Upload rules.json" },
];

export function StartScreen() {
  const lab = useLab();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seedValid = /^\d{1,9}$/.test(lab.seed);
  const canRun = seedValid && lab.notReady === null;

  async function takeFile(file: File | undefined) {
    if (!file) return;
    const result = await loadRulesFile(file);
    if (result.ok) {
      lab.setUploaded({ fileName: result.fileName, rules: result.rules });
      setError(null);
    } else {
      setError(`${result.fileName}: ${result.message}`);
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setOver(false);
    void takeFile(e.dataTransfer.files[0]);
  }

  function raise() {
    if (!canRun) return;
    lab.raise();
    go({ screen: "lab" });
  }

  function tryStarter() {
    lab.setSource("pack");
    lab.setPackId(rulePacks[0]?.id ?? "starter-fintech");
    if (!seedValid) lab.setSeed("1818");
    lab.raise();
    go({ screen: "lab" });
  }

  // Arrow keys move between the three tabs, as a tab list should.
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = SOURCES.findIndex((s) => s.id === lab.source);
    const next = SOURCES[(i + (e.key === "ArrowRight" ? 1 : SOURCES.length - 1)) % SOURCES.length];
    if (next) {
      lab.setSource(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  }

  return (
    <>
      <Header step={1} />
      <main className="page">
        <section className="row" style={{ alignItems: "center", gap: 48 }}>
          <div className="main stack" style={{ gap: 18 }}>
            <p className="kicker">Igor · a test lab for sign-up rules</p>
            <h1 className="title" style={{ fontSize: "clamp(38px, 5.4vw, 56px)" }}>
              Find the smallest fake that walks past your sign-up rules.
            </h1>
            <p className="lede">
              Bring the rules your sign-up form uses. Igor sends 1,000 made-up applicants through them, most honest and some
              fake, then shows you which fakes got in, the few parts that let them in, and what it costs to stop them.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
              <button type="button" className="btn btn-ember" onClick={tryStarter}>
                Try it with the starter rules
                <IconArrow />
              </button>
              <a
                className="btn btn-quiet"
                href="#how"
                onClick={(e) => {
                  e.preventDefault();
                  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  document.getElementById("how")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                }}
              >
                How it works
              </a>
            </div>
          </div>
          <figure className="side" style={{ margin: 0, display: "flex", justifyContent: "center" }}>
            <HeroTombstone />
          </figure>
        </section>

        <section id="how" aria-labelledby="how-title" className="stack" style={{ gap: 16, scrollMarginTop: 24 }}>
          <h2 id="how-title" style={{ fontSize: 28 }}>
            How it works, in four steps
          </h2>
          <ol className="how">
            <li>
              <span className="how-n">1</span>
              <strong>Bring your rules</strong>
              <p>Use a ready-made pack, write your own as plain sentences, or upload a rules.json. Nothing leaves your browser.</p>
            </li>
            <li>
              <span className="how-n">2</span>
              <strong>Raise the monsters</strong>
              <p>
                1,000 applicants try to sign up: honest <Term word="villager">villagers</Term> and fake{" "}
                <Term word="monster">monsters</Term>. You see which monsters <Term word="walk">walk</Term> in.
              </p>
            </li>
            <li>
              <span className="how-n">3</span>
              <strong>Shrink the one that got in</strong>
              <p>
                Igor cuts away fake parts, called <Term word="stitch">stitches</Term>, until only the ones it needs are left.
                That shows your <Term word="blind spot" />.
              </p>
            </li>
            <li>
              <span className="how-n">4</span>
              <strong>Price the fix</strong>
              <p>
                Compare fixes by how many honest people each one turns away, then bury the monsters in the{" "}
                <Term word="crypt" /> as tests.
              </p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="bring" className="stack" style={{ gap: 18 }}>
          <div className="section-head">
            <h2 id="bring" style={{ fontSize: 28 }}>
              Step 1 · Bring the rules
            </h2>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink-2)" }}>
              <IconLock />
              Your rules stay in this browser. Nothing is uploaded.
            </p>
          </div>

          <div className="source-tabs" role="tablist" aria-label="How to bring your rules" onKeyDown={onTabKey}>
            {SOURCES.map((s) => (
              <button
                key={s.id}
                id={`tab-${s.id}`}
                type="button"
                role="tab"
                aria-selected={lab.source === s.id}
                aria-controls={`panel-${s.id}`}
                tabIndex={lab.source === s.id ? 0 : -1}
                onClick={() => lab.setSource(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {lab.source === "pack" && (
            <div key="pack" id="panel-pack" role="tabpanel" aria-labelledby="tab-pack" className="source-panel stack" style={{ gap: 16 }}>
              <div className="grid-2">
                {rulePacks.map((p) => (
                  <button key={p.id} type="button" className="choice" aria-pressed={lab.packId === p.id} onClick={() => lab.setPackId(p.id)}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{p.name}</strong>
                      <span className="mono hint">{p.rules.length} rules</span>
                    </span>
                    <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{p.blurb}</span>
                  </button>
                ))}
              </div>
              <div className="card stack" style={{ gap: 16 }}>
                <div className="section-head">
                  <h3 style={{ fontSize: 20 }}>
                    {lab.activeRules.name} · {lab.activeRules.rules.length} rules
                  </h3>
                  <span className="hint">Read top to bottom. The first rule that matches decides.</span>
                </div>
                <RuleList rules={lab.activeRules.rules} />
                <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                  Want to change a rule?{" "}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      lab.setDrafts(starterDrafts());
                      lab.setSource("build");
                    }}
                  >
                    Edit a copy as sentences
                  </button>
                </p>
              </div>
            </div>
          )}

          {lab.source === "build" && (
            <div key="build" id="panel-build" role="tabpanel" aria-labelledby="tab-build" className="source-panel stack" style={{ gap: 16 }}>
              <div className="card stack" style={{ gap: 6 }}>
                <strong>Write each rule as a sentence: if something is true, then what happens.</strong>
                <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                  We started you with the 7 starter rules so you have something to change. Rules are checked from top to bottom,
                  and the first one that matches decides. If none match, the applicant is approved.
                </p>
              </div>
              <RuleBuilder drafts={lab.drafts} onChange={lab.setDrafts} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-quiet press"
                  disabled={lab.notReady !== null}
                  onClick={() => saveFile("rules.json", JSON.stringify(toRulesFile(lab.drafts), null, 2) + "\n", "application/json")}
                >
                  <IconDownload />
                  Download as rules.json
                </button>
                <button type="button" className="linkish" onClick={() => lab.setDrafts(starterDrafts())}>
                  Reset to the starter rules
                </button>
                <button type="button" className="linkish" onClick={() => lab.setDrafts([])}>
                  Start from nothing
                </button>
              </div>
            </div>
          )}

          {lab.source === "file" && (
            <div key="file" id="panel-file" role="tabpanel" aria-labelledby="tab-file" className="source-panel stack" style={{ gap: 16 }}>
              <div className="row">
                <label
                  className="drop main"
                  data-over={over}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                  }}
                  onDragLeave={() => setOver(false)}
                  onDrop={onDrop}
                >
                  <IconUpload />
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                    {lab.uploaded ? lab.uploaded.fileName : "Drop your rules.json here"}
                  </strong>
                  <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                    {lab.uploaded ? `${lab.uploaded.rules.length} rules read. Drop another to replace it.` : "or click to choose a file"}
                  </span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    aria-label="Choose a rules.json file"
                    onChange={(e) => {
                      void takeFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="side card stack" style={{ gap: 10 }}>
                  <strong>No file yet?</strong>
                  <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                    Download the starter rules as a file, change it in any text editor, then drop it here. Or use{" "}
                    <button type="button" className="linkish" onClick={() => lab.setSource("build")}>
                      Write my own rules
                    </button>{" "}
                    and skip the file.
                  </p>
                  <button type="button" className="btn btn-quiet press" onClick={() => saveFile("rules.json", exampleRulesText + "\n", "application/json")}>
                    <IconDownload />
                    Download an example
                  </button>
                  <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "pre-wrap" }}>
                    {'{ "id": "under-18",\n  "when": { "signal": "age", "op": "<", "value": 18 },\n  "then": "reject" }'}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Means: if age is less than 18, reject.</p>
                </div>
              </div>
              {error && (
                <p role="alert" className="notice">
                  {error}
                </p>
              )}
              {lab.uploaded && (
                <div className="card stack" style={{ gap: 16 }}>
                  <h3 style={{ fontSize: 20 }}>
                    {lab.uploaded.fileName} · {lab.uploaded.rules.length} rules
                  </h3>
                  <RuleList rules={lab.uploaded.rules} />
                </div>
              )}
            </div>
          )}

          <label style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink-2)" }}>
            <span>
              <Term word="seed">Seed</Term> for this world
            </span>
            <input
              className="field-in mono"
              inputMode="numeric"
              value={lab.seed}
              onChange={(e) => lab.setSeed(e.target.value.trim())}
              aria-invalid={!seedValid}
              style={{ width: 120 }}
            />
            <span style={{ color: seedValid ? "var(--ink-3)" : "#8A3A10" }}>
              {seedValid ? "Keep 1818 to follow the demo." : "A seed is a whole number, up to 9 digits."}
            </span>
          </label>
        </section>
      </main>

      <NextStep label={canRun ? "Next · Step 2" : "Not ready yet"} action={{ text: "Raise the monsters", onClick: raise, disabled: !canRun }}>
        {canRun ? (
          <>
            Send 1,000 applicants through <strong>{lab.activeRules.name}</strong> ({lab.activeRules.rules.length} rules) and see who gets
            in.
          </>
        ) : (
          (lab.notReady ?? "A seed is a whole number, up to 9 digits.")
        )}
      </NextStep>
    </>
  );
}
