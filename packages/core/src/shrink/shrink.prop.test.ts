// Property tests for the shrink function.
// Feature: shrink
//
// Properties:
//   1. Shrink keeps walking — shrunk monster still walks.
//   2. Shrink never adds — result.stitches.length <= monster.stitches.length.
//   3. Locally smallest — removing any remaining stitch stops the monster walking.
//   4. Deterministic — same monster + same ruleSet = same ShrinkResult.

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { evaluate } from "../rules/evaluate";
import { parseRules } from "../rules/parse";
import { makePrng, randInt, pick } from "../world/generate";
import { makeTestWorld, TEST_SCHEMA, HARM_LINE } from "../world/test-world";
import type { Monster, World } from "../world/types";
import type { RuleSet } from "../rules/types";
import { shrink } from "./index";

// --- Helpers ---

/** Build a monster guaranteed to walk with empty rules. Score >= HARM_LINE. */
function makeWalkingMonster(seed: number): {
  world: ReturnType<typeof makeTestWorld>;
  monster: Monster<{ part: "highScore"; value: number } | { part: "cleanFlag" } | { part: "localZone" }>;
} {
  const world = makeTestWorld(seed, 0, 0);
  const stitches = [
    { part: "highScore" as const, value: HARM_LINE + 10 },
    { part: "cleanFlag" as const },
    { part: "localZone" as const },
  ] as const;
  const records = world.records(stitches);
  const monster = {
    id: `m-prop-${seed}`,
    kind: "monster" as const,
    stitches,
    records,
  };
  return { world, monster };
}

function walksUnderRules<S>(world: World<S>, ruleSet: RuleSet, stitches: readonly S[]): boolean {
  const records = world.records(stitches);
  if (!world.harmDone(records)) return false;
  for (const rec of records) {
    const verdict = evaluate(ruleSet, rec);
    if (verdict.outcome !== "approve") return false;
  }
  return true;
}

/** Empty rule set — everything approves. */
function emptyRuleSet(): RuleSet {
  const r = parseRules({ rules: [] }, TEST_SCHEMA);
  if (!r.ok) throw new Error("setup");
  return r.ruleSet;
}

// --- Property 1: Shrink keeps walking ---
describe("Property 1: Shrink keeps walking", () => {
  it("shrunk monster still walks", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (seed) => {
          const { world, monster } = makeWalkingMonster(seed);
          const ruleSet = emptyRuleSet();
          const result = shrink(world, monster, ruleSet);
          expect(walksUnderRules(world, ruleSet, result.stitches)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 2: Shrink never adds ---
describe("Property 2: Shrink never adds", () => {
  it("result.stitches.length <= monster.stitches.length", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (seed) => {
          const { world, monster } = makeWalkingMonster(seed);
          const ruleSet = emptyRuleSet();
          const result = shrink(world, monster, ruleSet);
          expect(result.stitches.length).toBeLessThanOrEqual(monster.stitches.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 3: Locally smallest ---
describe("Property 3: Locally smallest", () => {
  it("removing any remaining stitch stops the monster walking", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (seed) => {
          const { world, monster } = makeWalkingMonster(seed);
          const ruleSet = emptyRuleSet();
          const result = shrink(world, monster, ruleSet);

          for (let i = 0; i < result.stitches.length; i++) {
            const withoutI = [
              ...result.stitches.slice(0, i),
              ...result.stitches.slice(i + 1),
            ];
            expect(walksUnderRules(world, ruleSet, withoutI)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 4: Deterministic ---
describe("Property 4: Deterministic", () => {
  it("same monster + same ruleSet = same ShrinkResult", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (seed) => {
          const { world, monster } = makeWalkingMonster(seed);
          const ruleSet = emptyRuleSet();
          const r1 = shrink(world, monster, ruleSet);
          const r2 = shrink(world, monster, ruleSet);
          expect(r1.stitches).toEqual(r2.stitches);
          expect(r1.removedCount).toBe(r2.removedCount);
          expect(r1.blindSpot).toEqual(r2.blindSpot);
        },
      ),
      { numRuns: 100 },
    );
  });
});
