// Igor world generator.
// No DOM, no React, no Node built-ins.
// All randomness comes from the seed via makePrng/randInt/pick.

import { makePrng, randInt, pick } from "@rip/core";
import type { Member, Monster, Signals, Villager, World } from "@rip/core";
import { IGOR_SCHEMA } from "./schema";
import { stitchesToSignals, signalsChangedByStitch, type IgorStitch } from "./stitches";

type Rng = () => number;

/** Integer in [lo, hi], inclusive. */
const between = (rng: Rng, lo: number, hi: number) => lo + randInt(rng, hi - lo + 1);

// ---------------------------------------------------------------------------
// Villagers
// ---------------------------------------------------------------------------
//
// Honest applicants are not perfect. A few have a blurred document photo,
// type fast, sign up from an office network or a new phone, or have no
// credit file yet. Those are what a fix costs.

function makeVillager(id: string, rng: Rng): Villager {
  const registryRoll = rng();
  // A typo or a changed name shows as "partial". Enough of them that
  // rejecting on registry breaks the 1% promise, while review does not.
  const registry = registryRoll < 0.92 ? "match" : registryRoll < 0.99 ? "partial" : "mismatch";

  const docScore = rng() < 0.003 ? between(rng, 25, 39) : between(rng, 55, 95);
  const age = between(rng, 18, 70);
  // Young applicants often have no credit file yet.
  const fileAgeMonths = rng() < 0.06 ? 0 : between(rng, 1, 120);

  const freshContact = rng() < 0.02;
  const phoneAgeDays = freshContact ? between(rng, 0, 2) : between(rng, 30, 1800);
  const emailAgeDays = freshContact ? between(rng, 0, 2) : between(rng, 30, 1800);

  const addressIds30d = between(rng, 1, 2);
  const addressRoll = rng();
  // A mail drop is only used by villagers who already have a file.
  const addressType =
    addressRoll < 0.01 && fileAgeMonths > 0 ? "maildrop" : addressRoll < 0.06 ? "commercial" : "residential";

  const ipRoll = rng();
  const ipType = ipRoll < 0.03 ? "datacenter" : ipRoll < 0.08 ? "vpn" : ipRoll < 0.33 ? "mobile" : "home";

  const fillSeconds = rng() < 0.002 ? between(rng, 12, 19) : between(rng, 25, 180);

  const record: Signals = {
    registry,
    docScore,
    age,
    fileAgeMonths,
    authorizedUserOnly: false,
    phoneAgeDays,
    emailAgeDays,
    deviceIds24h: 1,
    addressIds30d,
    addressType,
    ipType,
    fillSeconds,
  };
  return { id, kind: "villager", records: [record] };
}

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

type MonsterPattern =
  | "borrowed-number"
  | "piggyback"
  | "fully-fabricated"
  | "ring"
  | "manipulated-twin"
  | "aged-then-bust-out";

const PATTERNS: MonsterPattern[] = [
  "borrowed-number",
  "piggyback",
  "fully-fabricated",
  "ring",
  "manipulated-twin",
  "aged-then-bust-out",
];

interface Tail {
  /** Scales the chance of each careless part. 0 makes a careful monster. */
  sloppiness: number;
  fileAgeMonths: number;
  authorizedUserOnly: boolean;
  /** Chance that the device is shared by 3 or more identities. */
  busyDevice: number;
  oldContact: boolean;
}

/**
 * The parts after the ID number and name. Attackers are often careless:
 * a scripted form fill, a data-center network, a mail drop with no file,
 * a phone and email bought the same day, a shared device. Each one is a
 * chance for the rules to catch the monster.
 */
function tail(rng: Rng, t: Tail): IgorStitch[] {
  const s = t.sloppiness;

  const freshContact = rng() < 0.2 * s;
  const phoneAgeDays = freshContact ? between(rng, 0, 2) : t.oldContact ? between(rng, 400, 900) : between(rng, 10, 400);
  const emailAgeDays = freshContact ? between(rng, 0, 2) : t.oldContact ? between(rng, 400, 900) : between(rng, 10, 400);

  const deviceIds = rng() < t.busyDevice ? between(rng, 3, 6) : between(rng, 1, 2);

  const maildrop = rng() < 0.15 * s;
  const addressType = maildrop ? "maildrop" : "residential";
  const addressIds = maildrop ? between(rng, 2, 9) : 1;

  const ipRoll = rng();
  const ipType = ipRoll < 0.18 * s ? "datacenter" : ipRoll < 0.25 * s ? "vpn" : ipRoll < 0.5 ? "mobile" : "home";

  const fillSeconds = rng() < 0.25 * s ? between(rng, 4, 19) : between(rng, 30, 130);

  return [
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: deviceIds },
    { part: "address", addressType, idsInWindow: addressIds },
    { part: "network", ipType },
    { part: "file", ageMonths: t.fileAgeMonths, authorizedUserOnly: t.authorizedUserOnly },
    { part: "speed", fillSeconds },
  ];
}

/** The document check: a forged or poor document sometimes scores low. */
function docScore(rng: Rng, sloppiness: number): number {
  return rng() < 0.15 * sloppiness ? between(rng, 10, 39) : between(rng, 55, 90);
}

function makeMonster(id: string, rng: Rng, pattern: MonsterPattern, careful = false): Monster<IgorStitch> {
  const sloppiness = careful ? 0 : pattern === "aged-then-bust-out" ? 0.5 : 1;
  const base = { sloppiness, busyDevice: careful ? 0 : 0.1, oldContact: false };
  let head: IgorStitch[];
  let rest: IgorStitch[];

  switch (pattern) {
    case "borrowed-number":
      // A child's ID number under a made-up adult name.
      head = [
        { part: "idNumber", kind: "borrowed", docScore: docScore(rng, sloppiness), ownerAge: between(rng, 5, 15) },
        { part: "name", statedAge: between(rng, 25, 45) },
      ];
      rest = tail(rng, { ...base, fileAgeMonths: 0, authorizedUserOnly: false });
      break;
    case "manipulated-twin": {
      // A real adult's ID number with the name changed a little.
      const ownerAge = between(rng, 25, 60);
      head = [
        { part: "idNumber", kind: "borrowed", docScore: docScore(rng, sloppiness), ownerAge },
        { part: "name", statedAge: ownerAge, close: true },
      ];
      rest = tail(rng, { ...base, fileAgeMonths: between(rng, 6, 60), authorizedUserOnly: false });
      break;
    }
    case "piggyback":
      head = [
        { part: "idNumber", kind: "invented", docScore: docScore(rng, sloppiness) },
        { part: "name", statedAge: between(rng, 25, 45) },
      ];
      rest = tail(rng, { ...base, fileAgeMonths: between(rng, 1, 24), authorizedUserOnly: true });
      break;
    case "ring":
      head = [
        { part: "idNumber", kind: "invented", docScore: docScore(rng, sloppiness) },
        { part: "name", statedAge: between(rng, 22, 45) },
      ];
      rest = tail(rng, { ...base, busyDevice: 0.75, fileAgeMonths: 0, authorizedUserOnly: false });
      break;
    case "aged-then-bust-out":
      head = [
        { part: "idNumber", kind: "invented", docScore: docScore(rng, sloppiness) },
        { part: "name", statedAge: between(rng, 30, 50) },
      ];
      rest = tail(rng, { ...base, oldContact: true, fileAgeMonths: between(rng, 12, 36), authorizedUserOnly: false });
      break;
    default:
      // fully-fabricated: every part invented.
      head = [
        { part: "idNumber", kind: "invented", docScore: docScore(rng, sloppiness) },
        { part: "name", statedAge: between(rng, 21, 45) },
      ];
      rest = tail(rng, { ...base, fileAgeMonths: 0, authorizedUserOnly: false });
      break;
  }

  const stitches = [...head, ...rest];
  return { id, kind: "monster", stitches, records: [stitchesToSignals(stitches)] };
}

// ---------------------------------------------------------------------------
// World factory
// ---------------------------------------------------------------------------

/**
 * The monster the demo follows. The Autopsy and Close the gap screens open
 * monster #17, so it is always a careful borrowed-number monster.
 */
export const DEMO_MONSTER_INDEX = 17;

export function makeIgorWorld(seed: number, villagerCount: number, monsterCount: number): World<IgorStitch> {
  const rng = makePrng(seed);
  const members: Member<IgorStitch>[] = [];

  for (let i = 0; i < villagerCount; i++) {
    members.push(makeVillager(`v${i}`, rng));
  }

  const demoIndex = monsterCount > DEMO_MONSTER_INDEX ? DEMO_MONSTER_INDEX : 0;
  for (let i = 0; i < monsterCount; i++) {
    if (i === demoIndex) {
      members.push(makeMonster(`m${i}`, rng, "borrowed-number", true));
    } else {
      members.push(makeMonster(`m${i}`, rng, pick(rng, PATTERNS)));
    }
  }

  return {
    schema: IGOR_SCHEMA,
    members,

    records(stitches: readonly IgorStitch[]) {
      return [stitchesToSignals(stitches)];
    },

    harmDone(records) {
      // An applicant who really is the owner of the ID number does no harm.
      // Every monster's harm is applying as someone the registry does not
      // match: a borrowed, altered or invented identity.
      return records.every((r) => r["registry"] !== "match");
    },

    stitchLabel(stitch: IgorStitch): string {
      switch (stitch.part) {
        case "idNumber":
          if (stitch.kind === "invented") return "an invented ID number";
          return (stitch.ownerAge ?? 30) < 18 ? "a child's ID number" : "another resident's ID number";
        case "name":
          return stitch.close ? "a slightly changed name" : "a made-up name";
        case "phone":
          return `a phone number (${stitch.ageDays} days old)`;
        case "email":
          return `an email address (${stitch.ageDays} days old)`;
        case "device":
          return `a device (${stitch.idsInWindow} identities in 24 hours)`;
        case "address":
          return `a ${stitch.addressType} address`;
        case "network":
          return `a ${stitch.ipType} network`;
        case "file":
          return stitch.authorizedUserOnly
            ? `an authorized-user file (${stitch.ageMonths} months)`
            : `a credit file (${stitch.ageMonths} months)`;
        case "speed":
          return `form filled in ${stitch.fillSeconds}s`;
      }
    },

    signalsChanged(stitch: IgorStitch): readonly string[] {
      return signalsChangedByStitch(stitch);
    },
  };
}
