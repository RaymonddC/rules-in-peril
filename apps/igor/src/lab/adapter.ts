// Adapter: maps core engine output to the LabRun view type the Igor screens need.
// This is the only place that knows both the engine types and the view types.
// No DOM except through React; no Node built-ins.

import { shrink, priceFixes, signalsRead } from "@rip/core";
import type { RunReport, World } from "@rip/core";
import type { IgorStitch } from "../../world/stitches";
import type {
  Autopsy,
  BodyPart,
  CryptEntry,
  Fix,
  LabRun,
  MemberMark,
  MonsterPattern,
  RuleHits,
  RuleView,
  RunTotals,
  Stitch,
  StitchKind,
  Walker,
} from "./types";


// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

function detectPattern(stitches: readonly IgorStitch[]): MonsterPattern {
  const hasBorrowed = stitches.some((s) => s.part === "idNumber" && s.kind === "borrowed");
  const hasAuthorizedOnly = stitches.some(
    (s) => s.part === "file" && s.authorizedUserOnly,
  );
  const hasHighDevice = stitches.some((s) => s.part === "device" && s.idsInWindow >= 2);

  if (hasBorrowed) return "Borrowed number";
  if (hasAuthorizedOnly) return "Piggyback";
  if (hasHighDevice) return "Ring";

  const fileStitch = stitches.find((s) => s.part === "file");
  if (fileStitch && fileStitch.part === "file" && fileStitch.ageMonths >= 12) {
    return "Aged then bust-out";
  }

  return "Fully fabricated";
}

// ---------------------------------------------------------------------------
// Stitch → view Stitch
// ---------------------------------------------------------------------------

function stitchPart(s: IgorStitch): BodyPart {
  switch (s.part) {
    case "idNumber":
      return "idNumber";
    case "name":
      return "name";
    case "phone":
      return "phone";
    case "email":
      return "email";
    case "device":
      return "device";
    case "address":
      return "address";
    case "network":
      return "network";
    case "file":
      return "address"; // file doesn't have a body part; map to address as a proxy
    case "speed":
      return "device"; // speed doesn't have a body part; map to device as a proxy
  }
}

function stitchKind(s: IgorStitch): StitchKind {
  if (s.part === "idNumber") return s.kind;
  return "invented";
}

function stitchNote(s: IgorStitch): string {
  switch (s.part) {
    case "idNumber":
      if (s.kind === "invented") return "invented";
      return (s.ownerAge ?? 30) < 18 ? "a child's" : "borrowed";
    case "name":
      return `age ${s.statedAge}`;
    case "phone":
      return `${s.ageDays}d old`;
    case "email":
      return `${s.ageDays}d old`;
    case "device":
      return `${s.idsInWindow} in 24h`;
    case "address":
      return s.addressType;
    case "network":
      return s.ipType;
    case "file":
      return s.authorizedUserOnly ? "authorized-user" : `${s.ageMonths}mo`;
    case "speed":
      return `${s.fillSeconds}s`;
  }
}

function toViewStitch(s: IgorStitch): Stitch {
  return {
    part: stitchPart(s),
    kind: stitchKind(s),
    note: stitchNote(s),
  };
}

// ---------------------------------------------------------------------------
// Build Autopsy
// ---------------------------------------------------------------------------

function buildAutopsy(
  monsterId: number,
  original: readonly IgorStitch[],
  shrunk: readonly IgorStitch[],
  ruleSet: import("@rip/core").RuleSet,
  world: World<IgorStitch>,
  rules: RuleView[],
): Autopsy {
  const read = new Set(signalsRead(ruleSet));

  // Determine which stitches were removed
  const keptBodyParts: BodyPart[] = [];
  const cutOrder: BodyPart[] = [];
  const cuts: string[] = [];

  for (const s of original) {
    const bp = stitchPart(s);
    if (shrunk.includes(s)) {
      if (!keptBodyParts.includes(bp)) keptBodyParts.push(bp);
    } else {
      if (!cutOrder.includes(bp)) cutOrder.push(bp);
      cuts.push(`Cut the ${stitchNote(s)} ${s.part}`);
    }
  }

  // oneMoreCut: for each remaining stitch, what rule would catch it if removed?
  const oneMoreCut = shrunk.map((s) => {
    const signals = world.signalsChanged(s);
    // Find a rule that would fire if this stitch were removed
    const matchingRule = rules.find((rv) => {
      const changed = new Set(signals);
      // Simple heuristic: the rule reads a signal this stitch changes
      const ruleSignals = extractRuleSignals(rv.code);
      return ruleSignals.some((sig) => changed.has(sig));
    });
    return {
      drop: `Drop the ${stitchNote(s)} ${s.part}`,
      caughtBy: matchingRule?.id ?? "default",
      ruleCode: matchingRule?.code ?? "approve",
    };
  });

  // Core cards (kept stitches)
  const coreCards = shrunk.map((s) => ({
    kind: stitchKind(s),
    title: world.stitchLabel(s),
    body: describeStitch(s),
  }));

  // Blind spot: signals changed by remaining stitches that no rule reads
  const blindSignals = new Set<string>();
  for (const s of shrunk) {
    for (const sig of world.signalsChanged(s)) {
      if (!read.has(sig)) blindSignals.add(sig);
    }
  }
  const blindSignal = [...blindSignals].sort()[0] ?? "unknown";

  return {
    monsterId,
    stitches: original.map(toViewStitch),
    kept: keptBodyParts,
    cuts,
    cutOrder,
    oneMoreCut,
    coreCards,
    blindSpot: {
      signal: blindSignal,
      value: String(world.records(shrunk)[0]?.[blindSignal] ?? ""),
      body: `No rule reads "${blindSignal}", so this signal never fires.`,
    },
  };
}

function extractRuleSignals(code: string): string[] {
  // Parse "signal op value and signal op value ..." patterns
  const parts = code.split(/\s+and\s+/);
  return parts
    .map((part) => part.trim().split(/\s+/)[0] ?? "")
    .filter((s) => s.length > 0);
}

function describeStitch(s: IgorStitch): string {
  switch (s.part) {
    case "idNumber":
      return s.kind === "borrowed"
        ? "The Vesper registry holds this number for someone else."
        : "An ID number invented for this application.";
    case "name":
      return `The application states the applicant is ${s.statedAge} years old.`;
    case "phone":
      return `Phone number seen ${s.ageDays} days ago.`;
    case "email":
      return `Email address seen ${s.ageDays} days ago.`;
    case "device":
      return `${s.idsInWindow} identity seen on this device in the last 24 hours.`;
    case "address":
      return `A ${s.addressType} address.`;
    case "network":
      return `Connecting from a ${s.ipType} network.`;
    case "file":
      return s.authorizedUserOnly
        ? "File exists only because this identity was added as an authorized user."
        : `Credit file opened ${s.ageMonths} months ago.`;
    case "speed":
      return `Form completed in ${s.fillSeconds} seconds.`;
  }
}

// ---------------------------------------------------------------------------
// RuleView → code formatting
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mark generation
// ---------------------------------------------------------------------------

function buildMarks(
  world: World<IgorStitch>,
  report: RunReport<IgorStitch>,
): MemberMark[] {
  const walkerIds = new Set(report.walkers.map((w) => w.monsterId));

  // Build a verdict-per-member map
  const memberOutcomes = new Map<string, "approve" | "reject" | "review">();
  for (const v of report.verdicts) {
    const current = memberOutcomes.get(v.memberId);
    if (current === undefined || current === "approve") {
      memberOutcomes.set(v.memberId, v.outcome as "approve" | "reject" | "review");
    }
  }

  return world.members.map((m) => {
    const outcome = memberOutcomes.get(m.id) ?? "approve";
    if (m.kind === "monster") {
      if (walkerIds.has(m.id)) return "monster-walked";
      return "monster-caught";
    } else {
      if (outcome === "reject") return "villager-rejected";
      if (outcome === "review") return "villager-review";
      return "villager-approved";
    }
  });
}

// ---------------------------------------------------------------------------
// Main adapter function
// ---------------------------------------------------------------------------

export function engineRunToLabRun(
  world: World<IgorStitch>,
  report: RunReport<IgorStitch>,
  ruleSet: import("@rip/core").RuleSet,
  rules: RuleView[],
  seed: number,
  packId: string,
): LabRun {
  const totals: RunTotals = {
    applicants: report.totals.members,
    villagers: report.totals.villagers,
    monsters: report.totals.monsters,
    walked: report.totals.walked,
    caught: report.totals.caught,
    villagersRejected: report.byOutcome.reject.villagers,
    villagersReview: report.byOutcome.review.villagers,
  };

  const marks = buildMarks(world, report);

  const hits: RuleHits[] = report.ruleHits.map((h) => ({
    ruleId: h.ruleId,
    short: rules.find((r) => r.id === h.ruleId)?.plain ?? h.ruleId,
    monstersCaught: h.monstersCaught,
    villagersHit: h.villagersHit,
  }));

  // Shrink walkers and build autopsy entries
  const walkers: Walker[] = [];
  const autopsies: Partial<Record<number, Autopsy>> = {};
  const cryptEntries: CryptEntry[] = [];

  for (const walkerSummary of report.walkers) {
    const monster = world.members.find((m) => m.id === walkerSummary.monsterId);
    if (!monster || monster.kind !== "monster") continue;

    const shrinkResult = shrink(world, monster, ruleSet);
    const pattern = detectPattern(monster.stitches);

    // Use monsterId index as numeric ID for the view
    const numericId = parseInt(monster.id.replace(/^m/, ""), 10);

    const walker: Walker = {
      monsterId: numericId,
      pattern,
      stitchesBefore: monster.stitches.length,
      stitchesAfter: shrinkResult.stitches.length,
      summary: shrinkResult.stitches
        .map((s) => world.stitchLabel(s))
        .join(", "),
    };
    walkers.push(walker);
    autopsies[numericId] = buildAutopsy(
      numericId,
      monster.stitches,
      shrinkResult.stitches,
      ruleSet,
      world,
      rules,
    );

    cryptEntries.push({
      monsterId: numericId,
      stitches: shrinkResult.stitches.length,
      pattern,
    });
  }

  // Propose and price fixes
  // Fix A: reject on registry != match
  // Fix B: review on registry != match
  // Fix C: reject fileAgeMonths = 0
  const proposedFixes = [
    {
      id: "A",
      rule: {
        id: "registry-mismatch-reject",
        when: { signal: "registry", op: "!=" as const, value: "match" },
        then: "reject" as const,
      },
      label: "Reject on registry",
    },
    {
      id: "B",
      rule: {
        id: "registry-mismatch-review",
        when: { signal: "registry", op: "!=" as const, value: "match" },
        then: "review" as const,
      },
      label: "Review on registry",
    },
    {
      id: "C",
      rule: {
        id: "thin-file",
        when: { signal: "fileAgeMonths", op: "=" as const, value: 0 },
        then: "reject" as const,
      },
      label: "Reject thin files",
    },
  ];

  const pricedFixes = priceFixes(world, report, ruleSet, proposedFixes, seed);

  const fixes: Fix[] = pricedFixes.map((pf) => ({
    id: pf.id as Fix["id"],
    title: pf.label,
    placement: "New rule, on top",
    ruleCode: pf.ruleCode,
    monstersWalk: pf.monstersWalk,
    villagersRejectedDelta: pf.villagersRejectedDelta,
    villagersReviewDelta: pf.villagersReviewDelta,
    note: fixNote(pf.id, pf.villagersRejectedDelta, pf.villagersReviewDelta, pf.monstersWalk),
  }));

  return {
    seed,
    packId,
    totals,
    marks,
    hits,
    walkers,
    autopsies,
    fixes,
    crypt: cryptEntries,
  };
}

function fixNote(id: string, rejDelta: number, revDelta: number, walk: number): string {
  if (id === "A") {
    return `Stops every walker, but ${rejDelta} villagers with registry mismatches are turned away.`;
  }
  if (id === "B") {
    return `Stops every walker. ${revDelta} villagers go to review; nobody new is rejected.`;
  }
  if (id === "C") {
    return `Catches some walkers but ${walk} still walk. Rejects ${rejDelta} villagers with no credit file.`;
  }
  return "";
}
