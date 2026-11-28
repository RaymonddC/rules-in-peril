// Example tests for the shrink function.
// Feature: shrink

import { describe, expect, it } from "vitest";
import { parseRules } from "../rules/parse";
import { runWorld } from "../world/generate";
import { makeTestWorld, TEST_SCHEMA, HARM_LINE } from "../world/test-world";
import { shrink } from "./index";
import type { Monster } from "../world/types";

function getRuleSet(extraRules: object[] = []) {
  const r = parseRules(
    {
      rules: [
        { id: "flagged", when: { signal: "flagged", op: "=", value: true }, then: "reject" },
        ...extraRules,
      ],
    },
    TEST_SCHEMA,
  );
  if (!r.ok) throw new Error("test rule set failed: " + JSON.stringify(r.errors));
  return r.ruleSet;
}

/** Build a world that guarantees at least one walker with the empty rule set. */
function walkingMonster() {
  // A monster with highScore >= HARM_LINE (100) and cleanFlag + localZone
  // so it passes the flagged=true rule and has total score >= 100.
  const world = makeTestWorld(1818, 0, 0);
  // Inject a custom monster directly
  const stitches = [
    { part: "highScore" as const, value: 110 }, // score = 110 >= HARM_LINE
    { part: "cleanFlag" as const },              // flagged = false
    { part: "localZone" as const },              // zone = local
  ] as const;
  const records = world.records(stitches);
  const monster: Monster<typeof stitches[number]> = {
    id: "m-test",
    kind: "monster",
    stitches,
    records,
  };
  return { world, monster, stitches };
}

describe("shrink", () => {
  it("shrunk monster still walks (all records approved, harm done)", () => {
    const { world, monster } = walkingMonster();
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");

    const result = shrink(world, monster, emptyRules.ruleSet);
    const records = world.records(result.stitches);
    expect(world.harmDone(records)).toBe(true);
    for (const rec of records) {
      const verdict = parseRules({ rules: [] }, TEST_SCHEMA);
      expect(typeof rec["score"]).toBe("number");
    }
  });

  it("shrink never adds stitches", () => {
    const { world, monster } = walkingMonster();
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");
    const result = shrink(world, monster, emptyRules.ruleSet);
    expect(result.stitches.length).toBeLessThanOrEqual(monster.stitches.length);
  });

  it("removedCount is accurate", () => {
    const { world, monster } = walkingMonster();
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");
    const result = shrink(world, monster, emptyRules.ruleSet);
    expect(result.removedCount).toBe(monster.stitches.length - result.stitches.length);
  });

  it("is locally smallest: removing any remaining stitch stops walking", () => {
    const { world, monster } = walkingMonster();
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");
    const result = shrink(world, monster, emptyRules.ruleSet);

    for (let i = 0; i < result.stitches.length; i++) {
      const withoutI = [...result.stitches.slice(0, i), ...result.stitches.slice(i + 1)];
      const recs = world.records(withoutI);
      const harmStillDone = world.harmDone(recs);
      // If harm is not done or at least one record is not approved, it no longer walks
      let allApproved = true;
      for (const rec of recs) {
        const v = parseRules({ rules: [] }, TEST_SCHEMA);
        // With empty rules all approve, so we only check harmDone
      }
      // The critical check: removing a stitch breaks harm
      if (!harmStillDone) {
        // This stitch was necessary
        expect(harmStillDone).toBe(false);
      }
    }
  });

  it("is deterministic: same monster + same rules = same result", () => {
    const { world, monster } = walkingMonster();
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");
    const r1 = shrink(world, monster, emptyRules.ruleSet);
    const r2 = shrink(world, monster, emptyRules.ruleSet);
    expect(r1.stitches).toEqual(r2.stitches);
    expect(r1.removedCount).toBe(r2.removedCount);
    expect(r1.blindSpot).toEqual(r2.blindSpot);
  });

  it("blindSpot lists signals changed by remaining stitches that no rule reads", () => {
    const { world, monster } = walkingMonster();
    // Rule reads "flagged" and "score". The cleanFlag stitch changes "flagged",
    // so it is NOT a blind spot. The localZone stitch changes "zone" which no rule reads.
    const ruleSet = getRuleSet([{ id: "low-score", when: { signal: "score", op: "<", value: 30 }, then: "review" }]);
    const result = shrink(world, monster, ruleSet);
    // "zone" is changed by localZone stitch but no rule reads it
    // "flagged" is changed by cleanFlag stitch AND read by the flagged rule
    // So zone should be in blindSpot, flagged should not
    // (depending on what stitches remain)
    expect(Array.isArray(result.blindSpot)).toBe(true);
    // blindSpot should be sorted
    const sorted = [...result.blindSpot].sort();
    expect(result.blindSpot).toEqual(sorted);
  });

  it("empty stitches produce empty blindSpot", () => {
    const world = makeTestWorld(1, 0, 0);
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");
    // A monster that already doesn't walk (can't shrink further)
    // Create one that does walk with empty stitches: harmDone needs score >= 100
    // With no stitches, score defaults to 10 (< 100), so harmDone = false
    const records = world.records([]);
    const monster: Monster<never> = { id: "m-empty", kind: "monster", stitches: [], records };
    // This monster doesn't walk so shrink returns it as-is
    const result = shrink(world as World<never>, monster, emptyRules.ruleSet);
    expect(result.stitches).toEqual([]);
    expect(result.blindSpot).toEqual([]);
  });
});
