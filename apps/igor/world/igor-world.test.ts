// Tests for the Igor world generator.
// Feature: igor-world (R2, R3)

import { describe, expect, it } from "vitest";
import { evaluate, parseRules, runWorld, shrink } from "@rip/core";
import { makeIgorWorld } from "./index";
import { IGOR_SCHEMA } from "./schema";

const SEED = 1818;
const VILLAGER_COUNT = 880;
const MONSTER_COUNT = 120;

function getStarterPack() {
  const r = parseRules(
    {
      rules: [
        { id: "low-doc-score", when: { signal: "docScore", op: "<", value: 40 }, then: "reject" },
        { id: "under-18", when: { signal: "age", op: "<", value: 18 }, then: "reject" },
        { id: "busy-device", when: { signal: "deviceIds24h", op: ">=", value: 3 }, then: "reject" },
        { id: "datacenter-ip", when: { signal: "ipType", op: "=", value: "datacenter" }, then: "review" },
        {
          id: "maildrop-new-file",
          when: {
            all: [
              { signal: "addressType", op: "=", value: "maildrop" },
              { signal: "fileAgeMonths", op: "=", value: 0 },
            ],
          },
          then: "reject",
        },
        {
          id: "new-phone-and-email",
          when: {
            all: [
              { signal: "phoneAgeDays", op: "<", value: 3 },
              { signal: "emailAgeDays", op: "<", value: 3 },
            ],
          },
          then: "review",
        },
        { id: "fast-form", when: { signal: "fillSeconds", op: "<", value: 20 }, then: "reject" },
      ],
    },
    IGOR_SCHEMA,
  );
  if (!r.ok) throw new Error("starter pack parse failed: " + JSON.stringify(r.errors));
  return r.ruleSet;
}

describe("makeIgorWorld", () => {
  it("same seed gives the same world", () => {
    const w1 = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const w2 = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    expect(w1.members.map((m) => m.id)).toEqual(w2.members.map((m) => m.id));
    expect(w1.members.map((m) => m.records)).toEqual(w2.members.map((m) => m.records));
  });

  it("different seeds give different worlds", () => {
    const w1 = makeIgorWorld(1, VILLAGER_COUNT, MONSTER_COUNT);
    const w2 = makeIgorWorld(2, VILLAGER_COUNT, MONSTER_COUNT);
    const scores1 = w1.members.map((m) => m.records[0]!["docScore"]);
    const scores2 = w2.members.map((m) => m.records[0]!["docScore"]);
    expect(scores1).not.toEqual(scores2);
  });

  it("produces the correct member counts", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const villagers = world.members.filter((m) => m.kind === "villager");
    const monsters = world.members.filter((m) => m.kind === "monster");
    expect(villagers.length).toBe(VILLAGER_COUNT);
    expect(monsters.length).toBe(MONSTER_COUNT);
  });

  it("every record fits IGOR_SCHEMA (all 12 signal keys present)", () => {
    const world = makeIgorWorld(SEED, 50, 20);
    const schemaKeys = Object.keys(IGOR_SCHEMA);
    for (const member of world.members) {
      for (const rec of member.records) {
        for (const key of schemaKeys) {
          expect(key in rec, `member ${member.id} record missing key ${key}`).toBe(true);
        }
      }
    }
  });

  it("world.records(stitches) equals monster.records", () => {
    const world = makeIgorWorld(SEED, 0, 20);
    for (const member of world.members) {
      if (member.kind !== "monster") continue;
      const rebuilt = world.records(member.stitches);
      expect(rebuilt).toEqual(member.records);
    }
  });

  it("at least one borrowed-number monster is generated with 1000 members seed 1818", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const hasBorrowed = world.members.some(
      (m) => m.kind === "monster" && m.stitches.some((s) => s.part === "idNumber" && s.kind === "borrowed"),
    );
    expect(hasBorrowed).toBe(true);
  });

  it("every generated monster does harm: the registry never matches", () => {
    const world = makeIgorWorld(SEED, 0, MONSTER_COUNT);
    for (const member of world.members) {
      expect(world.harmDone(member.records)).toBe(true);
    }
  });

  it("an applicant who is the real owner of the ID number does no harm", () => {
    const world = makeIgorWorld(SEED, 0, 1);
    const records = world.records([{ part: "idNumber", kind: "borrowed", docScore: 80, ownerAge: 30 }]);
    expect(records[0]!["registry"]).toBe("match");
    expect(world.harmDone(records)).toBe(false);
  });
});

describe("Igor world with starter pack", () => {
  it("a borrowed-number monster walks with the starter pack (seed 1818)", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const ruleSet = getStarterPack();
    const report = runWorld(world, ruleSet, SEED);

    // There should be at least one walker
    expect(report.totals.walked).toBeGreaterThan(0);

    // The demo monster, m17, is always a careful borrowed-number monster.
    const walkerIds = new Set(report.walkers.map((w) => w.monsterId));
    expect(walkerIds.has("m17")).toBe(true);
  });

  it("the starter pack catches most monsters, and some still walk", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const report = runWorld(world, getStarterPack(), SEED);
    expect(report.totals.caught).toBeGreaterThan(MONSTER_COUNT / 2);
    expect(report.totals.walked).toBeGreaterThan(0);
  });

  it("every starter rule catches at least one monster", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const report = runWorld(world, getStarterPack(), SEED);
    for (const hit of report.ruleHits) {
      if (hit.ruleId === "under-18") continue; // monsters state an adult age
      expect(hit.monstersCaught, hit.ruleId).toBeGreaterThan(0);
    }
  });

  it("demo: monster #17 shrinks to a child's ID number and a made-up name, and the blind spot is registry", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const ruleSet = getStarterPack();
    const m17 = world.members.find((m) => m.id === "m17");
    if (!m17 || m17.kind !== "monster") throw new Error("m17 missing");

    const result = shrink(world, m17, ruleSet);
    expect(result.stitches.map((s) => s.part).sort()).toEqual(["idNumber", "name"]);
    expect(world.stitchLabel(result.stitches.find((s) => s.part === "idNumber")!)).toBe("a child's ID number");
    expect(result.blindSpot).toContain("registry");

    // One more cut gets it caught: each remaining stitch is needed.
    for (const s of result.stitches) {
      const rest = result.stitches.filter((x) => x !== s);
      const records = world.records(rest);
      const approved = records.every((r) => evaluate(ruleSet, r).outcome === "approve");
      expect(approved && world.harmDone(records), `dropping ${s.part}`).toBe(false);
    }
  });

  it("villager rejection rate with starter pack is at most 1%", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const ruleSet = getStarterPack();
    const report = runWorld(world, ruleSet, SEED);

    const rejectionRate = report.byOutcome.reject.villagers / VILLAGER_COUNT;
    expect(rejectionRate).toBeLessThanOrEqual(0.01);
  });

  it("same seed and same rules give the same report", () => {
    const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
    const ruleSet = getStarterPack();
    const r1 = runWorld(world, ruleSet, SEED);
    const r2 = runWorld(world, ruleSet, SEED);
    expect(r1).toEqual(r2);
  });
});
