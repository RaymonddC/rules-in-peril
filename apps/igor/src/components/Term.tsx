import { useId, useState, type ReactNode } from "react";

// The lab's words in plain language (glossary.md). One place, so every screen
// explains a word the same way.
export const GLOSSARY = {
  villager: "An honest applicant. Villagers are how a fix is priced: every one a rule turns away is a cost.",
  monster: "A fake applicant, stitched together from borrowed and invented parts.",
  walk: "A monster walks when your rules approve it. Reject and review both count as caught.",
  stitch: "One fake part of a monster, like a borrowed ID number or a made-up name.",
  seed: "A number that builds the same world every time. Same seed and same rules give the same report.",
  shrink: "Cut stitches away one by one while the monster still walks, to find the few that matter.",
  "blind spot": "A signal that would give the monster away, and that none of your rules reads.",
  crypt: "Caught monsters kept as tests. Every rule change sends them through again.",
} as const;

export type GlossaryWord = keyof typeof GLOSSARY;

/**
 * A word with a short definition. Hover (on a mouse), focus or tap to open.
 * The definition is also the button's description for screen readers.
 */
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
