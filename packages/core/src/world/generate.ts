// Seeded world generation and run logic.
// No DOM, no Node built-ins, no Math.random(), no Date.now().

import { evaluate } from "../rules/evaluate";
import type { RuleSet } from "../rules/types";
import type {
  Monster,
  RecordVerdict,
  RuleHitCount,
  RunReport,
  WalkerSummary,
  World,
} from "./types";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32 — deterministic, no global state)
// ---------------------------------------------------------------------------

export function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Pick a random integer in [0, n). */
export function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

/** Pick a random element from an array. */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick: empty array");
  return arr[randInt(rng, arr.length)]!;
}

/** Shuffle a copy of an array in-place using Fisher-Yates. */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Run a world against a rule set
// ---------------------------------------------------------------------------

/**
 * Run every member of a world through the rule set.
 * A monster walks when every one of its records is approved AND the world
 * confirms the harm is done. Only monsters can walk.
 * Returns the full RunReport.
 */
export function runWorld<S>(world: World<S>, ruleSet: RuleSet, seed: number): RunReport<S> {
  const verdicts: RecordVerdict[] = [];
  const walkers: WalkerSummary<S>[] = [];

  // Counts
  let villagers = 0;
  let monsters = 0;
  let walked = 0;
  let caught = 0;

  const rejectCounts = { villagers: 0, monsters: 0 };
  const reviewCounts = { villagers: 0, monsters: 0 };
  const approveCounts = { villagers: 0, monsters: 0 };

  // Rule hits: indexed by ruleId
  const hitMap = new Map<string, { monstersCaught: number; villagersHit: number }>();
  for (const rule of ruleSet.rules) {
    hitMap.set(rule.id, { monstersCaught: 0, villagersHit: 0 });
  }

  for (const member of world.members) {
    const isVillager = member.kind === "villager";
    if (isVillager) villagers++;
    else monsters++;

    // Evaluate each record. First non-approve across all records is the verdict
    // that "caught" the member. For walking we need all to be approve.
    let firstCatchRuleId: string | null = null;
    let firstCatchOutcome: "reject" | "review" | null = null;
    let allApproved = true;

    for (let ri = 0; ri < member.records.length; ri++) {
      const rec = member.records[ri]!;
      const v = evaluate(ruleSet, rec);
      verdicts.push({
        memberId: member.id,
        recordIndex: ri,
        outcome: v.outcome,
        ruleId: v.ruleId,
      });

      if (v.outcome !== "approve" && allApproved) {
        // First non-approve record
        allApproved = false;
        firstCatchOutcome = v.outcome as "reject" | "review";
        firstCatchRuleId = v.ruleId;
      }
    }

    // Determine member-level outcome for counts
    let memberOutcome: "reject" | "review" | "approve";
    if (!allApproved) {
      memberOutcome = firstCatchOutcome!;
    } else if (!isVillager) {
      // All records approved for a monster — check harm
      const mon = member as Monster<S>;
      const doesHarm = world.harmDone(mon.records);
      memberOutcome = doesHarm ? "approve" : "approve"; // still "approve" from rules perspective
    } else {
      memberOutcome = "approve";
    }

    // Rule hit accounting (first non-approve record's rule)
    if (!allApproved && firstCatchRuleId !== null) {
      const entry = hitMap.get(firstCatchRuleId);
      if (entry) {
        if (isVillager) entry.villagersHit++;
        else entry.monstersCaught++;
      }
    }

    // Walker check: monster + all approved + harm confirmed
    if (!isVillager && allApproved) {
      const mon = member as Monster<S>;
      if (world.harmDone(mon.records)) {
        walked++;
        walkers.push({ monsterId: mon.id, stitches: mon.stitches });
      } else {
        caught++;
      }
    } else if (!isVillager) {
      caught++;
    }

    // Outcome bucket counts
    if (isVillager) {
      if (memberOutcome === "reject") rejectCounts.villagers++;
      else if (memberOutcome === "review") reviewCounts.villagers++;
      else approveCounts.villagers++;
    } else {
      const mon = member as Monster<S>;
      const walks = allApproved && world.harmDone(mon.records);
      if (walks) approveCounts.monsters++;
      else if (memberOutcome === "reject") rejectCounts.monsters++;
      else if (memberOutcome === "review") reviewCounts.monsters++;
      else approveCounts.monsters++; // caught by harm check, not rules
    }
  }

  const ruleHits: RuleHitCount[] = ruleSet.rules.map((r) => {
    const h = hitMap.get(r.id) ?? { monstersCaught: 0, villagersHit: 0 };
    return { ruleId: r.id, monstersCaught: h.monstersCaught, villagersHit: h.villagersHit };
  });

  return {
    seed,
    totals: {
      members: world.members.length,
      villagers,
      monsters,
      walked,
      caught,
    },
    byOutcome: {
      reject: rejectCounts,
      review: reviewCounts,
      approve: approveCounts,
    },
    ruleHits,
    walkers,
    verdicts,
  };
}
