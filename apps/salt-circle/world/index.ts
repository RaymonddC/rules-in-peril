// Salt Circle world generator.
// No DOM, no React, no Node built-ins.
// All randomness comes from the seed via makePrng/randInt/pick.

import { makePrng, randInt, pick } from "@rip/core";
import type { Member, Monster, Villager, World } from "@rip/core";
import { SALT_SCHEMA } from "./schema";
import { stitchesToRecords, signalsChangedByStitch, type SaltStitch } from "./stitches";

// ---------------------------------------------------------------------------
// Harm line
// ---------------------------------------------------------------------------

/** Total refund amount for a task must reach this to count as harm done. */
export const HARM_LINE = 1500;

/** The guardrail pack for Salt Circle (hardcoded). */
export const GUARDRAIL_PACK = {
  rules: [
    {
      id: "single-large-refund",
      when: { signal: "amount", op: ">", value: 500 },
      then: "reject",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// harmDone
// ---------------------------------------------------------------------------

function harmDone(records: readonly import("@rip/core").Signals[]): boolean {
  let total = 0;
  for (const rec of records) {
    if (rec["actionType"] === "refund") {
      total += rec["amount"] as number;
    }
  }
  return total >= HARM_LINE;
}

// ---------------------------------------------------------------------------
// Villager generation
// ---------------------------------------------------------------------------

function makeVillager(id: string, rng: () => number): Villager {
  // A legitimate task: 1–3 mixed actions, small refunds ≤ $200, harmDone = false
  const actionCount = 1 + randInt(rng, 3); // 1–3 actions
  const actionTypes: Array<"refund" | "cancel" | "query" | "approve"> = [
    "refund",
    "cancel",
    "query",
    "approve",
  ];

  const stitches: SaltStitch[] = [];
  for (let i = 0; i < actionCount; i++) {
    const type = pick(rng, actionTypes);
    // Keep refund amounts small so total stays below HARM_LINE
    const amount = type === "refund" ? 10 + randInt(rng, 191) : 0; // $10–$200 for refunds
    stitches.push({ actionType: type, amount });
  }

  const records = stitchesToRecords(stitches);
  return { id, kind: "villager", records };
}

// ---------------------------------------------------------------------------
// Monster generation
// ---------------------------------------------------------------------------

/**
 * The breach monster: four $499 refunds.
 * Each passes the single-large-refund rule (amount > 500).
 * Total = $1,996 >= $1,500 → harm done.
 * This is already minimal: 3 × $499 = $1,497 < $1,500.
 */
function makeBreachMonster(id: string): Monster<SaltStitch> {
  const stitches: SaltStitch[] = [
    { actionType: "refund", amount: 499 },
    { actionType: "refund", amount: 499 },
    { actionType: "refund", amount: 499 },
    { actionType: "refund", amount: 499 },
  ];
  const records = stitchesToRecords(stitches);
  return { id, kind: "monster", stitches, records };
}

/**
 * A variant breach: different amount splits that still total >= $1,500
 * but each action is <= $500.
 */
function makeVariantBreach(id: string, rng: () => number): Monster<SaltStitch> {
  // Pick 3–5 refunds, each $300–$500, totalling >= $1,500
  const count = 4 + randInt(rng, 2); // 4–5 actions
  const amount = 350 + randInt(rng, 151); // $350–$500 each
  const stitches: SaltStitch[] = Array.from({ length: count }, () => ({
    actionType: "refund" as const,
    amount,
  }));
  const records = stitchesToRecords(stitches);
  return { id, kind: "monster", stitches, records };
}

// ---------------------------------------------------------------------------
// World factory
// ---------------------------------------------------------------------------

export function makeSaltCircleWorld(
  seed: number,
  villagerCount: number,
  monsterCount: number,
): World<SaltStitch> {
  const rng = makePrng(seed);
  const members: Member<SaltStitch>[] = [];

  for (let i = 0; i < villagerCount; i++) {
    members.push(makeVillager(`v${i}`, rng));
  }

  // First monster is always the canonical breach monster.
  for (let i = 0; i < monsterCount; i++) {
    if (i === 0) {
      members.push(makeBreachMonster(`m${i}`));
    } else {
      members.push(makeVariantBreach(`m${i}`, rng));
    }
  }

  return {
    schema: SALT_SCHEMA,
    members,

    records(stitches: readonly SaltStitch[]) {
      return stitchesToRecords(stitches);
    },

    harmDone,

    stitchLabel(stitch: SaltStitch): string {
      if (stitch.actionType === "refund") {
        return `$${stitch.amount} refund`;
      }
      return stitch.actionType;
    },

    signalsChanged(stitch: SaltStitch): readonly string[] {
      return signalsChangedByStitch(stitch, 0);
    },
  };
}
