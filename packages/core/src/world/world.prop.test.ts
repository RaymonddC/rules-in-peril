// Property tests for the world generator.
// Feature: world-generator

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseRules } from "../rules/parse";
import { runWorld } from "./generate";
import { formatReport } from "./report";
import { makeTestWorld, TEST_SCHEMA, HARM_LINE } from "./test-world";

// Arbitrary: a small seed
const arbSeed = fc.integer({ min: 1, max: 1_000_000 });
// Arbitrary: member counts
const arbCounts = fc.record({
  villagers: fc.integer({ min: 0, max: 30 }),
  monsters: fc.integer({ min: 0, max: 20 }),
});

// A simple rule set for the test world
const simpleRulesInput = {
  rules: [
    { id: "flagged", when: { signal: "flagged", op: "=", value: true }, then: "reject" },
    { id: "low-score", when: { signal: "score", op: "<", value: 30 }, then: "review" },
  ],
};
function getSimpleRuleSet() {
  const r = parseRules(simpleRulesInput, TEST_SCHEMA);
  if (!r.ok) throw new Error("setup");
  return r.ruleSet;
}

// --- Property 1: Same seed gives the same world ---
describe("Property 1: Same seed gives the same world", () => {
  it("two worlds from the same seed and counts are identical", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const w1 = makeTestWorld(seed, villagers, monsters);
        const w2 = makeTestWorld(seed, villagers, monsters);
        expect(w1.members.map((m) => m.id)).toEqual(w2.members.map((m) => m.id));
        expect(w1.members.map((m) => m.records)).toEqual(w2.members.map((m) => m.records));
        if (w1.members.length > 0 && w2.members.length > 0) {
          const m1 = w1.members[0]!;
          const m2 = w2.members[0]!;
          if (m1.kind === "monster" && m2.kind === "monster") {
            expect(m1.stitches).toEqual(m2.stitches);
          }
        }
      }),
      { numRuns: 150 },
    );
  });
});

// --- Property 2: Every record fits the schema ---
describe("Property 2: Every record fits the schema", () => {
  it("all signal keys in every record are present and have the right type", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        for (const member of world.members) {
          for (const rec of member.records) {
            // score: number
            expect(typeof rec["score"]).toBe("number");
            expect(Number.isFinite(rec["score"] as number)).toBe(true);
            // flagged: boolean
            expect(typeof rec["flagged"]).toBe("boolean");
            // zone: "local" | "remote"
            expect(["local", "remote"]).toContain(rec["zone"]);
          }
        }
      }),
      { numRuns: 150 },
    );
  });
});

// --- Property 3: Monster records equal world.records(stitches) ---
describe("Property 3: Monster records equal world.records(full stitches)", () => {
  it("rebuilding from full stitches gives the same records", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        for (const member of world.members) {
          if (member.kind !== "monster") continue;
          const rebuilt = world.records(member.stitches);
          expect(rebuilt).toEqual(member.records);
        }
      }),
      { numRuns: 150 },
    );
  });
});

// --- Property 4: Same seed and same rules give the same report ---
describe("Property 4: Same seed and same rules give the same report", () => {
  it("running twice gives identical reports", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        const ruleSet = getSimpleRuleSet();
        const r1 = runWorld(world, ruleSet, seed);
        const r2 = runWorld(world, ruleSet, seed);
        expect(r1).toEqual(r2);
      }),
      { numRuns: 150 },
    );
  });

  it("formatReport is deterministic: same report produces identical markdown", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        const ruleSet = getSimpleRuleSet();
        const report = runWorld(world, ruleSet, seed);
        expect(formatReport(report)).toBe(formatReport(report));
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 5: Totals add up ---
describe("Property 5: Totals are consistent", () => {
  it("villagers + monsters = members, walked + caught = monsters", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        const ruleSet = getSimpleRuleSet();
        const report = runWorld(world, ruleSet, seed);
        expect(report.totals.villagers + report.totals.monsters).toBe(report.totals.members);
        expect(report.totals.walked + report.totals.caught).toBe(report.totals.monsters);
      }),
      { numRuns: 150 },
    );
  });

  it("rule hit totals for monsters match total caught", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        const ruleSet = getSimpleRuleSet();
        const report = runWorld(world, ruleSet, seed);
        const totalCaught = report.ruleHits.reduce((s, h) => s + h.monstersCaught, 0);
        expect(totalCaught).toBe(report.totals.caught);
      }),
      { numRuns: 150 },
    );
  });
});

// --- Property 6: Only monsters walk ---
describe("Property 6: Only monsters walk", () => {
  it("every walker id belongs to a monster in the world", () => {
    fc.assert(
      fc.property(arbSeed, arbCounts, (seed, { villagers, monsters }) => {
        const world = makeTestWorld(seed, villagers, monsters);
        const ruleSet = getSimpleRuleSet();
        const report = runWorld(world, ruleSet, seed);
        const monsterIds = new Set(
          world.members.filter((m) => m.kind === "monster").map((m) => m.id),
        );
        for (const walker of report.walkers) {
          expect(monsterIds.has(walker.monsterId)).toBe(true);
        }
      }),
      { numRuns: 150 },
    );
  });
});
