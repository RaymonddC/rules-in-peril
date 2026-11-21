import { useId, useState, type ReactNode } from "react";

// Salt Circle's words in plain language (glossary.md).
export const GLOSSARY = {
  guardrail: "A rule the agent must pass before an action runs. Each one checks a single action on its own.",
  villager: "A legitimate agent task. Villagers are how a fix is priced: every one a fix blocks is a cost.",
  monster: "A sequence of agent actions that together do what the guardrails are meant to stop.",
  walk: "A monster walks when every one of its actions is allowed and it still does the harm.",
  "harm line": "How much has to go wrong for a task to count as harm. Here: more than $1,500 refunded on one task.",
  "blind spot": "A signal that would give the monster away, and that no guardrail reads.",
  seed: "A number that builds the same world every time.",
} as const;

export type GlossaryWord = keyof typeof GLOSSARY;

export function Term({ word, children }: { word: GlossaryWord; children?: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="term" data-open={open}>
      <button
        type="button"
        className="term-word"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {children ?? word}
      </button>
      <span role="tooltip" id={id} className="term-pop">
        <strong>{word}</strong> {GLOSSARY[word]}
      </span>
    </span>
  );
}

export function NextStep({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action: { text: string; href: string };
}) {
  return (
    <aside className="nextbar" aria-label="Next step">
      <div className="nextbar-inner">
        <div className="nextbar-text">
          <span className="nextbar-label">{label}</span>
          <span>{children}</span>
        </div>
        <a className="btn btn-ember" href={action.href}>
          {action.text}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
