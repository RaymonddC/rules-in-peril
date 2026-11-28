// A small test world in neutral words. Used by core tests only.
// Two member types:
//   - Villager: one record (single-record path)
//   - Monster: one or two records (multi-record path), stitched from parts
//
// Signals: score (number), flagged (boolean), zone (enum: local | remote)
// Harm definition: monster's total score across all its records >= HARM_LINE

import type { Member, Monster, SignalSchema, Signals, Villager, World } from "./types";
import { makePrng, pick, randInt } from "./generate";

export const TEST_SCHEMA: SignalSchema = {
  score: { kind: "number" },
  flagged: { kind: "boolean" },
  zone: { kind: "enum", values: ["local", "remote"] },
};

export const HARM_LINE = 100; // monster's total score across records must be >= this to walk

// A stitch is one part of a monster's identity.
export type TestStitch =
  | { part: "highScore"; value: number }     // contributes score
  | { part: "cleanFlag" }                    // contributes flagged: false
  | { part: "localZone" }                    // contributes zone: local
  | { part: "remoteZone" }                   // contributes zone: remote
  | { part: "secondRecord"; score: number }; // adds a second record

function stitchesToRecords(stitches: readonly TestStitch[]): readonly Signals[] {
  // Build record 0 from all non-secondRecord stitches
  let score = 10; // baseline
  let flagged = true;
  let zone: "local" | "remote" = "remote";

  for (const s of stitches) {
    if (s.part === "highScore") score = s.value;
    if (s.part === "cleanFlag") flagged = false;
    if (s.part === "localZone") zone = "local";
    if (s.part === "remoteZone") zone = "remote";
  }

  const record0: Signals = { score, flagged, zone };
  const records: Signals[] = [record0];

  // Add second record if the stitch is present
  for (const s of stitches) {
    if (s.part === "secondRecord") {
      records.push({ score: s.score, flagged: false, zone: "local" });
    }
  }

  return records;
}

function harmDone(records: readonly Signals[]): boolean {
  const total = records.reduce((sum, r) => sum + (r["score"] as number), 0);
  return total >= HARM_LINE;
}

/** Build a test world from a seed and counts. */
export function makeTestWorld(
  seed: number,
  villagerCount: number,
  monsterCount: number,
): World<TestStitch> {
  const rng = makePrng(seed);
  const members: Member<TestStitch>[] = [];

  // Villagers: single record, honest signals
  for (let i = 0; i < villagerCount; i++) {
    const score = 20 + randInt(rng, 60); // 20–79, never enough for harm alone
    const villager: Villager = {
      id: `v${i}`,
      kind: "villager",
      records: [{ score, flagged: false, zone: pick(rng, ["local", "remote"] as const) }],
    };
    members.push(villager);
  }

  // Monsters: built from stitches
  for (let i = 0; i < monsterCount; i++) {
    // Some monsters have two records (multi-record path)
    const multiRecord = rng() < 0.4;
    const stitches: TestStitch[] = [
      { part: "highScore", value: HARM_LINE + randInt(rng, 40) }, // 100–139, always >= HARM_LINE
      { part: "cleanFlag" },
      { part: "localZone" },
    ];
    if (multiRecord) {
      stitches.push({ part: "secondRecord", score: 50 + randInt(rng, 30) }); // 50–79
    }

    const records = stitchesToRecords(stitches);
    const monster: Monster<TestStitch> = {
      id: `m${i}`,
      kind: "monster",
      stitches,
      records,
    };
    members.push(monster);
  }

  return {
    schema: TEST_SCHEMA,
    members,
    records: stitchesToRecords,
    harmDone,
    stitchLabel(s) {
      if (s.part === "highScore") return `high score (${s.value})`;
      if (s.part === "cleanFlag") return "clean flag";
      if (s.part === "localZone") return "local zone";
      if (s.part === "remoteZone") return "remote zone";
      return `second record (score ${s.score})`;
    },
    signalsChanged(s) {
      if (s.part === "highScore") return ["score"];
      if (s.part === "cleanFlag") return ["flagged"];
      if (s.part === "localZone") return ["zone"];
      if (s.part === "remoteZone") return ["zone"];
      return ["score"]; // secondRecord adds a new record, its primary signal is score
    },
  };
}
