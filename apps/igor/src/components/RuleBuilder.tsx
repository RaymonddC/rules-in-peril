import { OUTCOMES, SIGNALS } from "../lab/example-rules";
import {
  conditionProblem,
  newCondition,
  newRule,
  opsFor,
  sentence,
  signalOf,
  withSignal,
  type DraftCondition,
  type DraftRule,
} from "../lab/rule-builder";
import type { Outcome } from "../lab/types";

function ValueField({ c, label, onChange }: { c: DraftCondition; label: string; onChange: (value: string) => void }) {
  const s = signalOf(c.signal);
  const problem = conditionProblem(c);
  if (s.kind === "boolean") {
    return (
      <select className="field-in" aria-label={label} value={c.value} onChange={(e) => onChange(e.target.value)}>
        <option value="true">yes</option>
        <option value="false">no</option>
      </select>
    );
  }
  if (s.kind === "enum") {
    return (
      <select className="field-in" aria-label={label} value={c.value} onChange={(e) => onChange(e.target.value)}>
        {(s.values ?? []).map((v) => (
          <option key={v} value={v}>
            {v.replace("_", " ")}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      className="field-in field-num mono"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={problem !== null}
      value={c.value}
      onChange={(e) => onChange(e.target.value.trim())}
    />
  );
}

/**
 * Rules as sentences: "If [signal] [is less than] [40], [reject]".
 * Order matters, the same as in a rules file: the first rule that matches decides.
 */
export function RuleBuilder({ drafts, onChange }: { drafts: DraftRule[]; onChange: (next: DraftRule[]) => void }) {
  const setRule = (i: number, r: DraftRule) => onChange(drafts.map((d, j) => (j === i ? r : d)));
  const setCond = (i: number, k: number, c: DraftCondition) => {
    const r = drafts[i];
    if (r) setRule(i, { ...r, conditions: r.conditions.map((x, j) => (j === k ? c : x)) });
  };
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= drafts.length) return;
    const next = drafts.slice();
    [next[i], next[j]] = [next[j] as DraftRule, next[i] as DraftRule];
    onChange(next);
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <ol className="builder">
        {drafts.map((r, i) => {
          const n = i + 1;
          return (
            <li key={r.key} className="builder-rule">
              <div className="builder-head">
                <span className="builder-n mono">R{n}</span>
                <input
                  className="field-in builder-name"
                  placeholder="Name this rule (optional)"
                  aria-label={`Rule ${n} name`}
                  value={r.name}
                  onChange={(e) => setRule(i, { ...r, name: e.target.value })}
                />
                <span className="builder-tools">
                  <button type="button" className="icon-btn" aria-label={`Move rule ${n} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Move rule ${n} down`} disabled={i === drafts.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Delete rule ${n}`} onClick={() => onChange(drafts.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              </div>

              {r.conditions.map((c, k) => {
                const sig = signalOf(c.signal);
                const label = `Rule ${n}, condition ${k + 1}`;
                const problem = conditionProblem(c);
                return (
                  <div key={c.key} className="builder-line">
                    <span className="builder-word">{k === 0 ? "If" : "and"}</span>
                    <span className="builder-fields">
                      <select className="field-in" aria-label={`${label}: what to check`} value={c.signal} onChange={(e) => setCond(i, k, withSignal(c, e.target.value))}>
                        {SIGNALS.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <select className="field-in" aria-label={`${label}: comparison`} value={c.op} onChange={(e) => setCond(i, k, { ...c, op: e.target.value as DraftCondition["op"] })}>
                        {opsFor(c.signal).map((o) => (
                          <option key={o.op} value={o.op}>
                            {o.words}
                          </option>
                        ))}
                      </select>
                      <ValueField c={c} label={`${label}: value`} onChange={(value) => setCond(i, k, { ...c, value })} />
                      {r.conditions.length > 1 && (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Remove ${label}`}
                          onClick={() => setRule(i, { ...r, conditions: r.conditions.filter((_, j) => j !== k) })}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                    <span className="builder-hint">{problem ?? sig.meaning}</span>
                  </div>
                );
              })}

              <button type="button" className="linkish builder-add-cond" onClick={() => setRule(i, { ...r, conditions: [...r.conditions, newCondition(r.conditions.at(-1)?.signal)] })}>
                + and another condition
              </button>

              <div className="builder-line">
                <span className="builder-word">then</span>
                <span className="builder-fields">
                  <select
                    className="field-in builder-then"
                    data-then={r.then}
                    aria-label={`Rule ${n}: what happens`}
                    value={r.then}
                    onChange={(e) => setRule(i, { ...r, then: e.target.value as Outcome })}
                  >
                    {OUTCOMES.map((o) => (
                      <option key={o.then} value={o.then}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="builder-hint">{OUTCOMES.find((o) => o.then === r.then)?.words}</span>
              </div>

              <p className="builder-sentence">{sentence(r)}</p>
            </li>
          );
        })}
      </ol>

      {drafts.length === 0 && <p className="hint">No rules yet, so everyone is approved. Add one to start.</p>}

      <button type="button" className="btn btn-quiet press" style={{ alignSelf: "flex-start" }} onClick={() => onChange([...drafts, newRule()])}>
        + Add a rule
      </button>
    </div>
  );
}
