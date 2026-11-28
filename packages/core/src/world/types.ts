// World interface types.
// Core knows nothing about Igor or Salt Circle. A world plugs in through here.
// No DOM, no Node built-ins.

import type { SignalSchema, Signals } from "../rules/types";

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * A villager is an honest member. Each villager presents exactly one signal
 * record (Igor) or one or more records (Salt Circle actions). Core sees only
 * the records; the truth label lives outside.
 */
export interface Villager {
  readonly id: string;
  readonly kind: "villager";
  /** One record per check. Igor: always length 1. Salt Circle: one per action. */
  readonly records: readonly Signals[];
}

/**
 * A monster is made of stitches. The world can rebuild its records from any
 * subset of its stitches — that is what makes shrinking possible.
 */
export interface Monster<S> {
  readonly id: string;
  readonly kind: "monster";
  /** Full ordered list of stitches the monster was generated with. */
  readonly stitches: readonly S[];
  /** Signal records built from the full stitch list. Same as world.records(stitches). */
  readonly records: readonly Signals[];
}

export type Member<S> = Villager | Monster<S>;

// ---------------------------------------------------------------------------
// World interface
// ---------------------------------------------------------------------------

/**
 * A World is what a world implementation (Igor, Salt Circle, or the test world)
 * gives to core. Core never imports from apps/.
 *
 * S is the stitch type, defined by the world.
 */
export interface World<S> {
  /** The signals this world's rules may read. */
  readonly schema: SignalSchema;

  /** All members, in generation order. */
  readonly members: readonly Member<S>[];

  /**
   * Rebuild signal records from an arbitrary subset of stitches.
   * Core calls this during shrinking. The returned records must fit `schema`.
   * The world decides what "no stitch" means for each signal.
   */
  records(stitches: readonly S[]): readonly Signals[];

  /**
   * Whether a monster's attack still does its intended harm, given these
   * signal records. Used by shrinking alongside "every record is approved".
   * Villagers never walk, so this is only called for monsters.
   */
  harmDone(records: readonly Signals[]): boolean;

  /**
   * Plain-English label for a stitch, for the autopsy.
   * e.g. "a child's ID number" or "$499 refund"
   */
  stitchLabel(stitch: S): string;

  /**
   * The signals that this stitch contributes to the records.
   * Used by the autopsy to find the blind spot.
   */
  signalsChanged(stitch: S): readonly string[];
}

// ---------------------------------------------------------------------------
// Run report
// ---------------------------------------------------------------------------

/** The verdict for one record of one member. */
export interface RecordVerdict {
  readonly memberId: string;
  readonly recordIndex: number;
  readonly outcome: "reject" | "review" | "approve";
  readonly ruleId: string | null;
}

/** Summary counts for one outcome across all members. */
export interface OutcomeCounts {
  readonly villagers: number;
  readonly monsters: number;
}

/** How many members a single rule caught. */
export interface RuleHitCount {
  readonly ruleId: string;
  /** Monsters whose first non-approve record was fired by this rule. */
  readonly monstersCaught: number;
  /** Villagers whose first non-approve record was fired by this rule. */
  readonly villagersHit: number;
}

/** A monster that walked: every record approved, harm confirmed. */
export interface WalkerSummary<S> {
  readonly monsterId: string;
  readonly stitches: readonly S[];
}

/** The full report from one run. Core returns this as data; a formatter turns it into text. */
export interface RunReport<S> {
  readonly seed: number;
  readonly totals: {
    readonly members: number;
    readonly villagers: number;
    readonly monsters: number;
    readonly walked: number;
    readonly caught: number;
  };
  readonly byOutcome: {
    readonly reject: OutcomeCounts;
    readonly review: OutcomeCounts;
    readonly approve: OutcomeCounts;
  };
  readonly ruleHits: readonly RuleHitCount[];
  readonly walkers: readonly WalkerSummary<S>[];
  /** Every individual record verdict, in member order. */
  readonly verdicts: readonly RecordVerdict[];
}
