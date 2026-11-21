import type { Outcome, RuleView } from "../lab/types";

const LABEL: Record<Outcome, string> = { reject: "Reject", review: "Review", approve: "Approve" };

export function OutcomePill({ outcome }: { outcome: Outcome }) {
  return <span className={`pill pill-${outcome}`}>{LABEL[outcome]}</span>;
}

/** An ordered rule set, read top to bottom. The default row closes the list. */
export function RuleList({ rules }: { rules: RuleView[] }) {
  return (
    <ol className="rules">
      {rules.map((r, i) => (
        <li key={r.id}>
          <span className="rn">R{i + 1}</span>
          <span className="rt">
            <span>{r.plain}</span>
            <code>{r.code}</code>
          </span>
          <OutcomePill outcome={r.then} />
        </li>
      ))}
      <li>
        <span className="rn" />
        <span className="rt" style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
          Nothing matched
        </span>
        <OutcomePill outcome="approve" />
      </li>
    </ol>
  );
}
