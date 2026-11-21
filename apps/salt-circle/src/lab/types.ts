// What the Salt Circle screens need to draw a run.
//
// View types, not engine types. Until packages/core and the Salt Circle world
// exist, the screens read sample-run.ts. Words follow glossary.md; the screen
// says allowed / ask a human / blocked for approve / review / reject.

export type Outcome = "reject" | "review" | "approve";

export interface Guardrail {
  id: string;
  plain: string;
  code: string;
  then: Outcome;
  monstersCaught: number;
  villagersHit: number;
}

export interface RunTotals {
  tasks: number;
  villagers: number;
  monsters: number;
  walked: number;
  caught: number;
  villagersBlocked: number;
  villagersAsked: number;
}

/** One action of the smallest breach, after shrinking. */
export interface BreachAction {
  call: string;
  amount: number;
}

export interface Breach {
  taskId: number;
  actionsBefore: number;
  orderId: string;
  actions: BreachAction[];
  harmLine: number;
  singleRefundLimit: number;
  blindSpot: string;
}

export interface Fix {
  id: "A" | "B" | "C";
  title: string;
  ruleCode: string;
  monstersWalk: number;
  villagersBlockedDelta: number;
  villagersAskedDelta: number;
}

export interface SaltRun {
  seed: number;
  packName: string;
  totals: RunTotals;
  guardrails: Guardrail[];
  breach: Breach;
  fixes: Fix[];
}
