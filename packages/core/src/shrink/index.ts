// Shrink + autopsy. Pure TypeScript, no DOM, no Node built-ins.
// Greedy left-to-right scan: for each stitch, try removing it.
// If the monster still walks (all records approved AND harmDone), drop it.
// Repeat until one full pass finds nothing to remove.

import { evaluate } from "../rules/evaluate";
import { signalsRead } from "../rules/evaluate";
import type { RuleSet } from "../rules/types";
import type { World, Monster } from "../world/types";

export interface ShrinkResult<S> {
  /** The remaining stitches after shrinking. */
  readonly stitches: readonly S[];
  /** How many stitches were removed. */
  readonly removedCount: number;
  /**
   * Signals changed by remaining stitches that no rule reads.
   * These are the blind spots: they would reveal the monster but no rule checks them.
   * Sorted, no duplicates.
   */
  readonly blindSpot: readonly string[];
}

function monsterWalks<S>(
  world: World<S>,
  ruleSet: RuleSet,
  stitches: readonly S[],
): boolean {
  const records = world.records(stitches);
  if (!world.harmDone(records)) return false;
  for (const rec of records) {
    const verdict = evaluate(ruleSet, rec);
    if (verdict.outcome !== "approve") return false;
  }
  return true;
}

export function shrink<S>(
  world: World<S>,
  monster: Monster<S>,
  ruleSet: RuleSet,
): ShrinkResult<S> {
  let current: readonly S[] = monster.stitches.slice();
  const originalCount = current.length;

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < current.length; i++) {
      const candidate = [...current.slice(0, i), ...current.slice(i + 1)];
      if (monsterWalks(world, ruleSet, candidate)) {
        current = candidate;
        changed = true;
        break; // restart scan from the beginning with updated list
      }
    }
  }

  // Compute blind spot: signals changed by remaining stitches that no rule reads.
  const read = new Set(signalsRead(ruleSet));
  const blindSet = new Set<string>();
  for (const stitch of current) {
    for (const sig of world.signalsChanged(stitch)) {
      if (!read.has(sig)) {
        blindSet.add(sig);
      }
    }
  }

  return {
    stitches: current,
    removedCount: originalCount - current.length,
    blindSpot: [...blindSet].sort(),
  };
}
