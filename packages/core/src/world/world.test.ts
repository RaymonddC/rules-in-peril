// Example tests for the world generator.
// Feature: world-generator

import { describe, expect, it } from "vitest";
import { parseRules } from "../rules/parse";
import { signalsRead } from "../rules/evaluate";
import { formatReport, runWorld } from "./index";
import { makeTestWorld, TEST_SCHEMA, HARM_LINE } from "./test-world";

// A small rule set for the test world.
const rulesInput = {
  rules: [
    { id: "flagged", when: { signal: "flagged", op: "=", value: true }, then: "reject" },
    { id: "low-score", when: { signal: "score", op: "<", value: 30 }, then: "review" },
  ],
};

function getTestRuleSet() {
  const r = parseRules(rulesInput, TEST_SCHEMA);
  if (!r.ok) throw new Error("test rule set failed: " + JSON.stringify(r.errors));
  return r.ruleSet;
}

describe("makeTestWorld", () => {
  it("produces the correct member counts", () => {
    const world = makeTestWorld(42, 10, 5);
    const villagers = world.members.filter((m) => m.kind === "villager");
    const monsters = world.members.filter((m) => m.kind === "monster");
    expect(villagers.length).toBe(10);
    expect(monsters.length).toBe(5);
  });

  it("every record fits the schema", () => {
    const world = makeTestWorld(1, 20, 10);
    const schemaKeys = Object.keys(TEST_SCHEMA);
    for (const member of world.members) {
      for (const rec of member.records) {
        for (const key of schemaKeys) {
          expect(key in rec).toBe(true);
        }
      }
    }
  });

  it("same seed gives the same world", () => {
    const w1 = makeTestWorld(99, 8, 4);
    const w2 = makeTestWorld(99, 8, 4);
    // Compare member ids and record values
    expect(w1.members.map((m) => m.id)).toEqual(w2.members.map((m) => m.id));
    expect(w1.members.map((m) => m.records)).toEqual(w2.members.map((m) => m.records));
  });

  it("different seeds give different worlds", () => {
    const w1 = makeTestWorld(1, 10, 5);
    const w2 = makeTestWorld(2, 10, 5);
    // Not guaranteed to differ on every signal but overwhelmingly likely
    const scores1 = w1.members.map((m) => m.records[0]!["score"]);
    const scores2 = w2.members.map((m) => m.records[0]!["score"]);
    expect(scores1).not.toEqual(scores2);
  });

  it("a monster's records equal world.records(stitches)", () => {
    const world = makeTestWorld(7, 5, 10);
    for (const member of world.members) {
      if (member.kind !== "monster") continue;
      const rebuilt = world.records(member.stitches);
      expect(rebuilt).toEqual(member.records);
    }
  });

  it("includes multi-record monsters (at least some have 2 records)", () => {
    // With 40 monsters, at least some should have 2 records
    const world = makeTestWorld(123, 0, 40);
    const multiRecord = world.members.filter((m) => m.kind === "monster" && m.records.length > 1);
    expect(multiRecord.length).toBeGreaterThan(0);
  });
});

describe("runWorld", () => {
  it("same seed and same rules give the same report", () => {
    const world = makeTestWorld(1818, 20, 10);
    const ruleSet = getTestRuleSet();
    const r1 = runWorld(world, ruleSet, 1818);
    const r2 = runWorld(world, ruleSet, 1818);
    expect(r1).toEqual(r2);
  });

  it("totals add up: villagers + monsters = members", () => {
    const world = makeTestWorld(42, 15, 8);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 42);
    expect(report.totals.villagers + report.totals.monsters).toBe(report.totals.members);
    expect(report.totals.walked + report.totals.caught).toBe(report.totals.monsters);
  });

  it("every verdict has a memberId matching a member", () => {
    const world = makeTestWorld(5, 5, 5);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 5);
    const memberIds = new Set(world.members.map((m) => m.id));
    for (const v of report.verdicts) {
      expect(memberIds.has(v.memberId)).toBe(true);
    }
  });

  it("every verdict names the rule that fired, or null for default", () => {
    const world = makeTestWorld(3, 10, 5);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 3);
    const ruleIds = new Set(ruleSet.rules.map((r) => r.id));
    for (const v of report.verdicts) {
      if (v.ruleId !== null) {
        expect(ruleIds.has(v.ruleId)).toBe(true);
      }
    }
  });

  it("walkers are monsters whose every record is approved and harm is confirmed", () => {
    const world = makeTestWorld(7, 5, 20);
    // Use empty rules so all members are approved by default
    const emptyRules = parseRules({ rules: [] }, TEST_SCHEMA);
    if (!emptyRules.ok) throw new Error("setup");
    const report = runWorld(world, emptyRules.ruleSet, 7);

    for (const walker of report.walkers) {
      const member = world.members.find((m) => m.id === walker.monsterId);
      expect(member?.kind).toBe("monster");
      // harm must be done
      if (member?.kind === "monster") {
        expect(world.harmDone(member.records)).toBe(true);
      }
    }
  });

  it("rule hits count correctly: monsters caught + villagers hit", () => {
    const world = makeTestWorld(11, 10, 10);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 11);
    // Sum of all monstersCaught should equal total monsters caught
    const totalCaughtByRules = report.ruleHits.reduce((s, h) => s + h.monstersCaught, 0);
    expect(totalCaughtByRules).toBe(report.totals.caught);
  });

  it("report has one ruleHit entry per rule", () => {
    const world = makeTestWorld(2, 5, 5);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 2);
    expect(report.ruleHits.length).toBe(ruleSet.rules.length);
    expect(report.ruleHits.map((h) => h.ruleId)).toEqual(ruleSet.rules.map((r) => r.id));
  });
});

describe("formatReport", () => {
  it("returns a non-empty string", () => {
    const world = makeTestWorld(1, 5, 5);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 1);
    const md = formatReport(report);
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(0);
  });

  it("contains seed and key counts", () => {
    const world = makeTestWorld(1818, 10, 5);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 1818);
    const md = formatReport(report);
    expect(md).toContain("1818");
    expect(md).toContain("flagged");
  });

  it("same report produces the same markdown byte for byte", () => {
    const world = makeTestWorld(42, 8, 4);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 42);
    expect(formatReport(report)).toBe(formatReport(report));
  });

  it("contains no timestamps or absolute paths", () => {
    const world = makeTestWorld(42, 5, 5);
    const ruleSet = getTestRuleSet();
    const report = runWorld(world, ruleSet, 42);
    const md = formatReport(report);
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no ISO dates
    expect(md).not.toMatch(/[A-Z]:\\/); // no Windows paths
    expect(md).not.toMatch(/\/Users\//); // no Unix paths
  });
});

describe("signalsRead and World.signalsChanged", () => {
  it("world.signalsChanged returns valid signal names", () => {
    const world = makeTestWorld(1, 0, 10);
    const schemaKeys = new Set(Object.keys(TEST_SCHEMA));
    for (const member of world.members) {
      if (member.kind !== "monster") continue;
      for (const stitch of member.stitches) {
        for (const sig of world.signalsChanged(stitch)) {
          expect(schemaKeys.has(sig)).toBe(true);
        }
      }
    }
  });
});
