// SAMPLE DATA. Not engine output.
//
// The engine (packages/core) and the Igor world (apps/igor/world) are not
// built yet. This file holds one hand-written run for seed 1818 with the
// starter fintech pack, so the screens can be built and reviewed now.
// Totals add up and respect the product promises, but every count here is a
// placeholder. Replace this file with an adapter over the engine's report.
//
// All names and values are invented for Vesper (see synthetic-only.md).

import type { CryptEntry, LabRun, MemberMark, MonsterPattern, RulePack } from "./types";

export const SAMPLE_SEED = 1818;

export const starterFintech: RulePack = {
  id: "starter-fintech",
  name: "Starter fintech",
  blurb: "A typical bank sign-up: document score, age, device, network, address, speed.",
  rules: [
    { id: "low-doc-score", plain: "ID document check scores below 40", code: "docScore < 40", then: "reject" },
    { id: "under-18", plain: "Applicant is under 18", code: "age < 18", then: "reject" },
    { id: "busy-device", plain: "3 or more identities on this device in 24 hours", code: "deviceIds24h >= 3", then: "reject" },
    { id: "datacenter-ip", plain: "Signed up from a data-center network", code: "ipType = datacenter", then: "review" },
    { id: "maildrop-new-file", plain: "Mail-drop address and no credit file yet", code: "addressType = maildrop and fileAgeMonths = 0", then: "reject" },
    { id: "new-phone-and-email", plain: "Phone and email both seen less than 3 days ago", code: "phoneAgeDays < 3 and emailAgeDays < 3", then: "review" },
    { id: "fast-form", plain: "Form filled in under 20 seconds", code: "fillSeconds < 20", then: "reject" },
  ],
};

export const rulePacks: RulePack[] = [starterFintech];

/** Deterministic shuffle so the dot field looks the same on every load. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

function marks(): MemberMark[] {
  const list: MemberMark[] = [];
  const add = (m: MemberMark, n: number) => {
    for (let i = 0; i < n; i++) list.push(m);
  };
  add("monster-walked", 41);
  add("monster-caught", 79);
  add("villager-rejected", 7);
  add("villager-review", 38);
  add("villager-approved", 835);
  return seededShuffle(list, SAMPLE_SEED);
}

const walkers: LabRun["walkers"] = [
  { monsterId: 17, pattern: "Borrowed number", stitchesBefore: 7, stitchesAfter: 2, summary: "A child’s ID number, a made-up name" },
  { monsterId: 52, pattern: "Borrowed number", stitchesBefore: 6, stitchesAfter: 2, summary: "A child’s ID number, a made-up name" },
  { monsterId: 8, pattern: "Piggyback", stitchesBefore: 5, stitchesAfter: 2, summary: "An authorized-user file, a made-up name" },
  { monsterId: 91, pattern: "Aged then bust-out", stitchesBefore: 8, stitchesAfter: 3, summary: "An aged file, an aged phone, an aged email" },
  { monsterId: 33, pattern: "Manipulated twin", stitchesBefore: 6, stitchesAfter: 3, summary: "A real identity, a new phone, a new address" },
  { monsterId: 104, pattern: "Fully fabricated", stitchesBefore: 9, stitchesAfter: 4, summary: "Four invented parts, no registry record" },
];

function crypt(): CryptEntry[] {
  const known: CryptEntry[] = walkers.map((w) => ({
    monsterId: w.monsterId,
    stitches: w.stitchesAfter,
    pattern: w.pattern,
  }));
  const patterns: MonsterPattern[] = ["Borrowed number", "Piggyback", "Manipulated twin", "Aged then bust-out", "Fully fabricated", "Ring"];
  const used = new Set(known.map((k) => k.monsterId));
  const rest: CryptEntry[] = [];
  let id = 3;
  let i = 0;
  while (known.length + rest.length < 41) {
    id += 2 + (i % 3);
    if (!used.has(id)) {
      rest.push({ monsterId: id, stitches: 2 + (i % 3), pattern: patterns[i % patterns.length] as MonsterPattern });
      i++;
    }
  }
  return [...known, ...rest];
}

export const sampleRun: LabRun = {
  seed: SAMPLE_SEED,
  packId: starterFintech.id,
  totals: {
    applicants: 1000,
    villagers: 880,
    monsters: 120,
    walked: 41,
    caught: 79,
    villagersRejected: 7,
    villagersReview: 38,
  },
  marks: marks(),
  hits: [
    { ruleId: "low-doc-score", short: "Low document score", monstersCaught: 24, villagersHit: 2 },
    { ruleId: "under-18", short: "Under 18", monstersCaught: 0, villagersHit: 1 },
    { ruleId: "busy-device", short: "Busy device", monstersCaught: 19, villagersHit: 2 },
    { ruleId: "datacenter-ip", short: "Data-center network", monstersCaught: 9, villagersHit: 14 },
    { ruleId: "maildrop-new-file", short: "Mail drop, no file", monstersCaught: 11, villagersHit: 1 },
    { ruleId: "new-phone-and-email", short: "New phone and email", monstersCaught: 10, villagersHit: 24 },
    { ruleId: "fast-form", short: "Too-fast form", monstersCaught: 6, villagersHit: 1 },
  ],
  walkers,
  autopsies: {
    17: {
      monsterId: 17,
      stitches: [
        { part: "name", kind: "invented", note: "invented" },
        { part: "idNumber", kind: "borrowed", note: "a child’s" },
        { part: "network", kind: "borrowed", note: "home line" },
        { part: "email", kind: "borrowed", note: "4 yrs old" },
        { part: "phone", kind: "borrowed", note: "2 yrs old" },
        { part: "address", kind: "borrowed", note: "borrowed" },
        { part: "device", kind: "borrowed", note: "clean" },
      ],
      kept: ["name", "idNumber"],
      cutOrder: ["network", "email", "phone", "address", "device"],
      cuts: [
        "Cut the borrowed home network",
        "Cut the borrowed, aged email",
        "Cut the borrowed, aged phone",
        "Cut the borrowed address",
        "Cut the borrowed, clean device",
      ],
      oneMoreCut: [
        { drop: "Drop the child’s ID number: with no ID there is no document to score", caughtBy: "R1", ruleCode: "docScore < 40" },
        { drop: "Drop the made-up name: it applies as the child, age 9", caughtBy: "R2", ruleCode: "age < 18" },
      ],
      coreCards: [
        { kind: "borrowed", title: "A child’s ID number", body: "The Vesper registry holds this number for a 9-year-old." },
        { kind: "invented", title: "A made-up name", body: "With a birth date that makes the applicant 34. The registry record disagrees." },
      ],
      blindSpot: {
        signal: "registry",
        value: "mismatch",
        body: "The name and birth date don’t agree with the registry record for this ID number.",
      },
    },
  },
  fixes: [
    {
      id: "A",
      title: "Reject on registry",
      placement: "New rule, on top",
      ruleCode: "registry != match → reject",
      monstersWalk: 0,
      villagersRejectedDelta: 27,
      villagersReviewDelta: 0,
      note: "Stops every walker, but villagers with a typo or a changed name in the registry are turned away for good.",
    },
    {
      id: "B",
      title: "Review on registry",
      placement: "New rule, on top",
      ruleCode: "registry != match → review",
      monstersWalk: 0,
      villagersRejectedDelta: 0,
      villagersReviewDelta: 27,
      note: "Stops every walker. 3.1% of villagers wait for a human; nobody new is turned away.",
    },
    {
      id: "C",
      title: "Reject thin files",
      placement: "New rule, on top",
      ruleCode: "fileAgeMonths = 0 → reject",
      monstersWalk: 12,
      villagersRejectedDelta: 62,
      villagersReviewDelta: -5,
      note: "The usual reflex. Young villagers with no file yet are rejected, and 12 monsters still walk.",
    },
  ],
  crypt: crypt(),
};

/** Promise from product.md: at most 1% of villagers wrongly rejected. */
export const REJECT_PROMISE = 0.01;
