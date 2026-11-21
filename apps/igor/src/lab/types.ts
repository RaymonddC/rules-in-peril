// What the Igor screens need to draw a run.
//
// These are view types, not engine types. Until packages/core and
// apps/igor/world exist, the screens read sample-run.ts. When the engine
// lands, an adapter turns its report into these shapes and the screens stay
// as they are. Words follow .kiro/steering/glossary.md.

export type Outcome = "reject" | "review" | "approve";

/** One rule as a person reads it, plus the condition as written in rules.json. */
export interface RuleView {
  id: string;
  plain: string;
  code: string;
  then: Outcome;
}

export interface RulePack {
  id: string;
  name: string;
  blurb: string;
  rules: RuleView[];
}

/** How many members one rule caught in a run. */
export interface RuleHits {
  ruleId: string;
  short: string;
  monstersCaught: number;
  villagersHit: number;
}

export type MemberMark =
  | "monster-walked"
  | "monster-caught"
  | "villager-rejected"
  | "villager-review"
  | "villager-approved";

export interface RunTotals {
  applicants: number;
  villagers: number;
  monsters: number;
  walked: number;
  caught: number;
  villagersRejected: number;
  villagersReview: number;
}

export type BodyPart = "name" | "idNumber" | "network" | "email" | "phone" | "address" | "device";
export type StitchKind = "borrowed" | "invented";

export interface Stitch {
  part: BodyPart;
  kind: StitchKind;
  /** Short note shown on the body map, such as "a child's". */
  note: string;
}

export type MonsterPattern =
  | "Borrowed number"
  | "Manipulated twin"
  | "Fully fabricated"
  | "Ring"
  | "Piggyback"
  | "Aged then bust-out";

/** A monster that walked, after shrinking. */
export interface Walker {
  monsterId: number;
  pattern: MonsterPattern;
  stitchesBefore: number;
  stitchesAfter: number;
  summary: string;
}

export interface OneMoreCut {
  drop: string;
  caughtBy: string;
  ruleCode: string;
}

export interface Autopsy {
  monsterId: number;
  /** Every stitch the monster had before shrinking. */
  stitches: Stitch[];
  /** Parts that survived shrinking. */
  kept: BodyPart[];
  /** Cuts in the order the search made them. Each one still walked. */
  cuts: string[];
  /** The part each cut removed, in the same order as cuts. */
  cutOrder: BodyPart[];
  oneMoreCut: OneMoreCut[];
  coreCards: { kind: StitchKind; title: string; body: string }[];
  blindSpot: { signal: string; value: string; body: string };
}

export interface Fix {
  id: "A" | "B" | "C";
  title: string;
  placement: string;
  ruleCode: string;
  monstersWalk: number;
  villagersRejectedDelta: number;
  villagersReviewDelta: number;
  note: string;
}

export interface CryptEntry {
  monsterId: number;
  stitches: number;
  pattern: MonsterPattern;
}

export interface LabRun {
  seed: number;
  packId: string;
  totals: RunTotals;
  marks: MemberMark[];
  hits: RuleHits[];
  walkers: Walker[];
  autopsies: Partial<Record<number, Autopsy>>;
  fixes: Fix[];
  crypt: CryptEntry[];
}
