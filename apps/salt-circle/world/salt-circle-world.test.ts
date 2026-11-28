// Tests for the Salt Circle world generator.
// Feature: salt-circle-world (R7)

import { describe, expect, it } from "vitest";
import { parseRules, runWorld, shrink } from "@rip/core";
import { makeSaltCircleWorld, HARM_LINE, GUARDRAIL_PACK } from "./index";
import { SALT_SCHEMA } from "./schema";

const SEED = 1818;
const VILLAGER_COUNT = 440;
const MONSTER_COUNT = 60;

function getGuardrailRuleSet() {
  const r = parseRules(GUARDRAIL_PACK, SALT_SCHEMA);
  if (!r.ok) throw new Error("guardrail parse failed: " + JSON.stringify(r.errors));
  return r.ruleSet;
}

describe("makeSaltCircleWorld", () => {
  it("same seed gives the same world", () => {
    const w1 = makeSaltCircleWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const w2 = makeSaltCircleWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    expect(w1.members.map((m) => m.id)).toEqual(w2.members.map((m) => m.id));
    expect(w1.members.map((m) => m.records)).toEqual(w2.members.map((m) => m.records));
  });

  it("produces the correct member counts", () => {
    const world = makeSaltCircleWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const villagers = world.members.filter((m) => m.kind === "villager");
    const monsters = world.members.filter((m) => m.kind === "monster");
    expect(villagers.length).toBe(VILLAGER_COUNT);
    expect(monsters.length).toBe(MONSTER_COUNT);
  });

  it("every record fits SALT_SCHEMA", () => {
    const world = makeSaltCircleWorld(SEED, 20, 10);
    const schemaKeys = Object.keys(SALT_SCHEMA);
    for (const member of world.members) {
      for (const rec of member.records) {
        for (const key of schemaKeys) {
          expect(key in rec, `member ${member.id} record missing key ${key}`).toBe(true);
        }
      }
    }
  });

  it("world.records(stitches) equals monster.records", () => {
    const world = makeSaltCircleWorld(SEED, 0, 20);
    for (const member of world.members) {
      if (member.kind !== "monster") continue;
      const rebuilt = world.records(member.stitches);
      expect(rebuilt).toEqual(member.records);
    }
  });
});

describe("Salt Circle breach detection", () => {
  it("the breach monster (4x $499 refund) walks with the single-large-refund guardrail", () => {
    const world = makeSaltCircleWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const ruleSet = getGuardrailRuleSet();
    const report = runWorld(world, ruleSet, SEED);

    // m0 is always the canonical breach monster
    expect(report.walkers.some((w) => w.monsterId === "m0")).toBe(true);
    expect(report.totals.walked).toBeGreaterThan(0);
  });

  it("the breach monster total refund is >= HARM_LINE", () => {
    const world = makeSaltCircleWorld(SEED, 0, 1);
    const monster = world.members.find((m) => m.kind === "monster")!;
    expect(world.harmDone(monster.records)).toBe(true);
  });

  it("harm line is 1500", () => {
    expect(HARM_LINE).toBe(1500);
  });

  it("removing one $499 refund from the breach stops harm (3x$499 = $1497 < $1500)", () => {
    const world = makeSaltCircleWorld(SEED, 0, 1);
    const monster = world.members.find((m) => m.kind === "monster")!;
    if (monster.kind !== "monster") throw new Error("setup");

    // Remove one stitch
    const withThree = monster.stitches.slice(0, 3);
    const records = world.records(withThree);
    expect(world.harmDone(records)).toBe(false); // 3 × $499 = $1,497 < $1,500
  });

  it("the breach is already the smallest found by shrinking (all 4 stitches remain)", () => {
    const world = makeSaltCircleWorld(SEED, 0, 1);
    const ruleSet = getGuardrailRuleSet();
    const monster = world.members.find((m) => m.kind === "monster")!;
    if (monster.kind !== "monster") throw new Error("setup");

    const result = shrink(world, monster, ruleSet);
    // 4 stitches are the minimum: removing any one stops harm
    expect(result.stitches.length).toBe(4);
    expect(result.removedCount).toBe(0);
  });

  it("the blind spot is runningTotal (no guardrail reads it)", () => {
    const world = makeSaltCircleWorld(SEED, 0, 1);
    const ruleSet = getGuardrailRuleSet();
    const monster = world.members.find((m) => m.kind === "monster")!;
    if (monster.kind !== "monster") throw new Error("setup");

    const result = shrink(world, monster, ruleSet);
    expect(result.blindSpot).toContain("runningTotal");
  });

  it("same seed and same rules give the same report", () => {
    const world = makeSaltCircleWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const ruleSet = getGuardrailRuleSet();
    const r1 = runWorld(world, ruleSet, SEED);
    const r2 = runWorld(world, ruleSet, SEED);
    expect(r1).toEqual(r2);
  });
});
