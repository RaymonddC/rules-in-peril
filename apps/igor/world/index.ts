// Igor world generator.
// No DOM, no React, no Node built-ins.
// All randomness comes from the seed via makePrng/randInt/pick.

import { makePrng, randInt, pick } from "@rip/core";
import type { Member, Monster, Villager, World } from "@rip/core";
import { IGOR_SCHEMA } from "./schema";
import { stitchesToSignals, signalsChangedByStitch, type IgorStitch } from "./stitches";

// ---------------------------------------------------------------------------
// Villager generation
// ---------------------------------------------------------------------------

function makeVillager(id: string, rng: () => number): Villager {
  // registry: 92% match, 7% partial, 1% mismatch
  const registryRoll = rng();
  const registry =
    registryRoll < 0.92 ? "match" : registryRoll < 0.99 ? "partial" : "mismatch";

  // docScore: 55–95
  const docScore = 55 + randInt(rng, 41);

  // age: 18–70
  const age = 18 + randInt(rng, 53);

  // fileAgeMonths: 1–120
  const fileAgeMonths = 1 + randInt(rng, 120);

  // authorizedUserOnly: false for all villagers
  const authorizedUserOnly = false;

  // phoneAgeDays: 30–1800
  const phoneAgeDays = 30 + randInt(rng, 1771);

  // emailAgeDays: 30–1800
  const emailAgeDays = 30 + randInt(rng, 1771);

  // deviceIds24h: 1
  const deviceIds24h = 1;

  // addressIds30d: 1–2
  const addressIds30d = 1 + randInt(rng, 2);

  // addressType: 95% residential, 5% commercial
  const addressType = rng() < 0.95 ? "residential" : "commercial";

  // ipType: 70% home, 25% mobile, 5% vpn
  const ipRoll = rng();
  const ipType = ipRoll < 0.70 ? "home" : ipRoll < 0.95 ? "mobile" : "vpn";

  // fillSeconds: 25–180
  const fillSeconds = 25 + randInt(rng, 156);

  return {
    id,
    kind: "villager",
    records: [{
      registry,
      docScore,
      age,
      fileAgeMonths,
      authorizedUserOnly,
      phoneAgeDays,
      emailAgeDays,
      deviceIds24h,
      addressIds30d,
      addressType,
      ipType,
      fillSeconds,
    }],
  };
}

// ---------------------------------------------------------------------------
// Monster patterns
// ---------------------------------------------------------------------------

type MonsterPattern =
  | "borrowed-number"
  | "piggyback"
  | "fully-fabricated"
  | "ring"
  | "manipulated-twin"
  | "aged-then-bust-out";

/**
 * Borrowed number monster.
 *
 * Uses a child's ID number (registry=mismatch) but the application form says
 * the applicant is 34. No starter-pack rule reads `registry`, so it walks.
 * docScore is good (55–90) so the low-doc-score rule doesn't fire.
 * statedAge is 25–45 so the under-18 rule doesn't fire.
 */
function makeBorrowedNumber(id: string, rng: () => number): Monster<IgorStitch> {
  const docScore = 55 + randInt(rng, 36); // 55–90
  const statedAge = 25 + randInt(rng, 21); // 25–45
  const phoneAgeDays = 30 + randInt(rng, 300);
  const emailAgeDays = 30 + randInt(rng, 300);
  const fillSeconds = 30 + randInt(rng, 100);

  const stitches: IgorStitch[] = [
    { part: "idNumber", kind: "borrowed", docScore },
    { part: "name", statedAge },
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: 1 },
    { part: "address", addressType: "residential", idsInWindow: 1 },
    { part: "network", ipType: "home" },
    { part: "file", ageMonths: 24, authorizedUserOnly: false },
    { part: "speed", fillSeconds },
  ];

  const records = [stitchesToSignals(stitches)];
  return { id, kind: "monster", stitches, records };
}

/**
 * Piggyback monster.
 *
 * Thin identity: file exists only because someone added this person as an
 * authorized user. The file stitch sets authorizedUserOnly=true.
 * No starter-pack rule checks authorizedUserOnly, so it can walk.
 */
function makePiggyback(id: string, rng: () => number): Monster<IgorStitch> {
  const docScore = 55 + randInt(rng, 36); // 55–90
  const statedAge = 25 + randInt(rng, 21);
  const phoneAgeDays = 30 + randInt(rng, 300);
  const emailAgeDays = 30 + randInt(rng, 300);
  const fillSeconds = 30 + randInt(rng, 100);
  const fileAgeMonths = 1 + randInt(rng, 48);

  const stitches: IgorStitch[] = [
    { part: "idNumber", kind: "invented", docScore },
    { part: "name", statedAge },
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: 1 },
    { part: "address", addressType: "residential", idsInWindow: 1 },
    { part: "network", ipType: "home" },
    { part: "file", ageMonths: fileAgeMonths, authorizedUserOnly: true },
    { part: "speed", fillSeconds },
  ];

  const records = [stitchesToSignals(stitches)];
  return { id, kind: "monster", stitches, records };
}

/**
 * Fully fabricated monster.
 *
 * All parts invented, tuned to pass the starter pack.
 * Good docScore, age 25–45, low device/address counts, home IP,
 * phone/email age > 3 days, fill time > 20s.
 */
function makeFullyFabricated(id: string, rng: () => number): Monster<IgorStitch> {
  const docScore = 55 + randInt(rng, 36);
  const statedAge = 25 + randInt(rng, 21);
  const phoneAgeDays = 10 + randInt(rng, 300);
  const emailAgeDays = 10 + randInt(rng, 300);
  const fillSeconds = 30 + randInt(rng, 100);

  const stitches: IgorStitch[] = [
    { part: "idNumber", kind: "invented", docScore },
    { part: "name", statedAge },
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: 1 },
    { part: "address", addressType: "residential", idsInWindow: 1 },
    { part: "network", ipType: "home" },
    { part: "file", ageMonths: 1, authorizedUserOnly: false },
    { part: "speed", fillSeconds },
  ];

  const records = [stitchesToSignals(stitches)];
  return { id, kind: "monster", stitches, records };
}

/**
 * Ring monster.
 *
 * Several identities share a device (high deviceIds24h) or an address.
 * The busy-device rule (deviceIds24h >= 3) or addressIds30d catches many,
 * but some slip through (deviceIds24h = 2).
 */
function makeRing(id: string, rng: () => number): Monster<IgorStitch> {
  const docScore = 55 + randInt(rng, 36);
  const statedAge = 25 + randInt(rng, 21);
  const phoneAgeDays = 10 + randInt(rng, 200);
  const emailAgeDays = 10 + randInt(rng, 200);
  const fillSeconds = 30 + randInt(rng, 100);
  // Use 2 so it stays below the busy-device threshold of 3
  const deviceIds = 2;
  const addressIds = 2;

  const stitches: IgorStitch[] = [
    { part: "idNumber", kind: "invented", docScore },
    { part: "name", statedAge },
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: deviceIds },
    { part: "address", addressType: "residential", idsInWindow: addressIds },
    { part: "network", ipType: "home" },
    { part: "file", ageMonths: 1, authorizedUserOnly: false },
    { part: "speed", fillSeconds },
  ];

  const records = [stitchesToSignals(stitches)];
  return { id, kind: "monster", stitches, records };
}

/**
 * Manipulated twin monster.
 *
 * A real identity with a few details changed: good registry (match for the
 * original parts), but new phone/email to dodge the age checks.
 */
function makeManipulatedTwin(id: string, rng: () => number): Monster<IgorStitch> {
  const docScore = 55 + randInt(rng, 36);
  const statedAge = 25 + randInt(rng, 21);
  // new phone and email (but each individually >= 3 days)
  const phoneAgeDays = 5 + randInt(rng, 100);
  const emailAgeDays = 5 + randInt(rng, 100);
  const fillSeconds = 30 + randInt(rng, 100);

  const stitches: IgorStitch[] = [
    { part: "idNumber", kind: "invented", docScore },
    { part: "name", statedAge },
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: 1 },
    { part: "address", addressType: "residential", idsInWindow: 1 },
    { part: "network", ipType: "home" },
    { part: "file", ageMonths: 12, authorizedUserOnly: false },
    { part: "speed", fillSeconds },
  ];

  const records = [stitchesToSignals(stitches)];
  return { id, kind: "monster", stitches, records };
}

/**
 * Aged-then-bust-out monster.
 *
 * Everything looks seasoned: old file, old phone, old email.
 * No starter-pack rule catches it.
 */
function makeAgedThenBustOut(id: string, rng: () => number): Monster<IgorStitch> {
  const docScore = 55 + randInt(rng, 36);
  const statedAge = 30 + randInt(rng, 20);
  const phoneAgeDays = 400 + randInt(rng, 500);
  const emailAgeDays = 400 + randInt(rng, 500);
  const fillSeconds = 30 + randInt(rng, 100);
  const fileAgeMonths = 12 + randInt(rng, 24);

  const stitches: IgorStitch[] = [
    { part: "idNumber", kind: "invented", docScore },
    { part: "name", statedAge },
    { part: "phone", ageDays: phoneAgeDays },
    { part: "email", ageDays: emailAgeDays },
    { part: "device", idsInWindow: 1 },
    { part: "address", addressType: "residential", idsInWindow: 1 },
    { part: "network", ipType: "home" },
    { part: "file", ageMonths: fileAgeMonths, authorizedUserOnly: false },
    { part: "speed", fillSeconds },
  ];

  const records = [stitchesToSignals(stitches)];
  return { id, kind: "monster", stitches, records };
}

function makeMonster(
  id: string,
  rng: () => number,
  pattern: MonsterPattern,
): Monster<IgorStitch> {
  switch (pattern) {
    case "borrowed-number":
      return makeBorrowedNumber(id, rng);
    case "piggyback":
      return makePiggyback(id, rng);
    case "fully-fabricated":
      return makeFullyFabricated(id, rng);
    case "ring":
      return makeRing(id, rng);
    case "manipulated-twin":
      return makeManipulatedTwin(id, rng);
    case "aged-then-bust-out":
      return makeAgedThenBustOut(id, rng);
  }
}

// ---------------------------------------------------------------------------
// World factory
// ---------------------------------------------------------------------------

const PATTERNS: MonsterPattern[] = [
  "borrowed-number",
  "piggyback",
  "fully-fabricated",
  "ring",
  "manipulated-twin",
  "aged-then-bust-out",
];

export function makeIgorWorld(
  seed: number,
  villagerCount: number,
  monsterCount: number,
): World<IgorStitch> {
  const rng = makePrng(seed);
  const members: Member<IgorStitch>[] = [];

  for (let i = 0; i < villagerCount; i++) {
    members.push(makeVillager(`v${i}`, rng));
  }

  // Ensure at least one borrowed-number monster for the demo (seed 1818).
  // We place it at index 0 and use the remaining monster slots for random patterns.
  for (let i = 0; i < monsterCount; i++) {
    let pattern: MonsterPattern;
    if (i === 0) {
      pattern = "borrowed-number";
    } else {
      pattern = pick(rng, PATTERNS);
    }
    members.push(makeMonster(`m${i}`, rng, pattern));
  }

  return {
    schema: IGOR_SCHEMA,
    members,

    records(stitches: readonly IgorStitch[]) {
      return [stitchesToSignals(stitches)];
    },

    harmDone(_records) {
      // For Igor: harm is simply that the identity was approved.
      // The walk check (all records approved) is the full harm check.
      return true;
    },

    stitchLabel(stitch: IgorStitch): string {
      switch (stitch.part) {
        case "idNumber":
          return stitch.kind === "borrowed" ? "a child's ID number" : "an invented ID number";
        case "name":
          return `a made-up name (stated age ${stitch.statedAge})`;
        case "phone":
          return `a phone number (${stitch.ageDays} days old)`;
        case "email":
          return `an email address (${stitch.ageDays} days old)`;
        case "device":
          return `a device (${stitch.idsInWindow} identity in window)`;
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
