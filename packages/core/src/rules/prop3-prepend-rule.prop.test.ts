// Feature: rule-engine, Property 3: A rule on top changes only what it matches

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { arbMembers, arbRuleSet, arbSignalSchema, arbSignals } from "./arbitraries.js";
import { evaluate, matches } from "./evaluate.js";
import type { Rule, RuleSet } from "./types.js";

// ---------------------------------------------------------------------------
// Helper: generate a Rule with a fixed unique id "extra" that never appears
// in `arbRuleSet` output (arbRuleSet uses /^[a-z][a-z0-9]{0,7}$/ ids, and
// "extra" contains a hyphen in the original name — but we just use "extra"
// which IS valid under that regex; to be safe we filter it out of the ruleSet
// in the property itself).
// ---------------------------------------------------------------------------

function arbExtraRule(schema: Parameters<typeof arbSignals>[0]): fc.Arbitrary<Rule> {
  const entries = Object.entries(schema);
  // Pick one signal from the schema to build a single-condition When
  return fc.constantFrom(...entries).chain(([signal, type]) => {
    let condArb: fc.Arbitrary<Rule["when"]>;
    if (type.kind === "number") {
      condArb = fc.tuple(
        fc.constantFrom("=" as const, "!=" as const, "<" as const, "<=" as const, ">" as const, ">=" as const),
        fc.integer({ min: -10, max: 10 }),
      ).map(([op, value]) => ({ signal, op, value }));
    } else if (type.kind === "boolean") {
      condArb = fc.tuple(
        fc.constantFrom("=" as const, "!=" as const),
        fc.boolean(),
      ).map(([op, value]) => ({ signal, op, value }));
    } else {
      // enum — type.values is readonly string[]
      condArb = fc.tuple(
        fc.constantFrom("=" as const, "!=" as const),
        fc.constantFrom(...type.values),
      ).map(([op, value]) => ({ signal, op, value }));
    }

    return fc.tuple(
      condArb,
      fc.constantFrom("reject" as const, "review" as const, "approve" as const),
    ).map(([when, then]) => ({ id: "xtra", when, then }));
  });
}

// ---------------------------------------------------------------------------
// Property 3.1/3.2 — Prepending a rule governs iff it matches; otherwise
//                     the verdict is unchanged.
// Validates: Requirements 2.6, 2.7
// ---------------------------------------------------------------------------

describe("Property 3: A rule on top changes only what it matches", () => {
  it(
    "3.1/3.2 — prepended rule governs iff it matches; otherwise verdict is unchanged",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            fc.tuple(
              // Strip any rule whose id happens to be "xtra" to avoid collision
              arbRuleSet(schema).map((rs) => ({
                rules: rs.rules.filter((r) => r.id !== "xtra"),
              })),
              arbSignals(schema),
              arbExtraRule(schema),
            ),
          ),
          ([ruleSet, signals, extraRule]) => {
            const patchedRuleSet: RuleSet = { rules: [extraRule, ...ruleSet.rules] };

            const originalVerdict = evaluate(ruleSet, signals);
            const patchedVerdict = evaluate(patchedRuleSet, signals);

            if (matches(extraRule.when, signals)) {
              // Extra rule fired — must report its own outcome and id
              expect(patchedVerdict.outcome).toBe(extraRule.then);
              expect(patchedVerdict.ruleId).toBe(extraRule.id);
            } else {
              // Extra rule did not fire — result must be identical to original
              expect(patchedVerdict).toEqual(originalVerdict);
            }
          },
        ),
        { numRuns: 200 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 3.3 — A reject rule on top never removes existing rejections
  // Validates: Requirements 2.6, 2.7
  // ---------------------------------------------------------------------------

  it(
    "3.3 — a reject rule on top never un-rejects a previously rejected member",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            fc.tuple(
              arbRuleSet(schema).map((rs) => ({
                rules: rs.rules.filter((r) => r.id !== "xtra"),
              })),
              arbMembers(schema),
              arbExtraRule(schema).map((r) => ({ ...r, then: "reject" as const })),
            ),
          ),
          ([ruleSet, members, rejectRule]) => {
            const patchedRuleSet: RuleSet = { rules: [rejectRule, ...ruleSet.rules] };

            for (const member of members) {
              const originalVerdict = evaluate(ruleSet, member.signals);
              const patchedVerdict = evaluate(patchedRuleSet, member.signals);

              // A member rejected before must still be rejected after
              if (originalVerdict.outcome === "reject") {
                expect(patchedVerdict.outcome).toBe("reject");
              }
            }
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});
