// Feature: rule-engine, Property 5: Same input, same verdicts

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { arbMembers, arbRuleSet, arbSignalSchema } from "./arbitraries.js";
import { runRules } from "./evaluate.js";
import { parseRules } from "./parse.js";
import type { RuleSet } from "./types.js";

// ---------------------------------------------------------------------------
// Helper: recursively reverse the order of keys in every plain object.
// Arrays are traversed but their element order is preserved.
// ---------------------------------------------------------------------------
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseKeys);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const reversedKeys = Object.keys(obj).reverse();
    return Object.fromEntries(reversedKeys.map((k) => [k, reverseKeys(obj[k])]));
  }
  return value;
}

// ---------------------------------------------------------------------------
// Helper: convert a RuleSet back to the plain-object shape that parseRules
// accepts (i.e. the { rules: [...] } envelope).
// ---------------------------------------------------------------------------
function ruleSetToInput(ruleSet: RuleSet): unknown {
  return JSON.parse(JSON.stringify(ruleSet));
}

// ---------------------------------------------------------------------------
// Property 5.1 — runRules called twice returns identical results
//
// For any valid rule set and member list: running runRules twice with the
// same inputs returns identical results, with exactly one verdict per member
// in member order.
//
// Validates: Requirements 3.3, 5.1
// ---------------------------------------------------------------------------

describe("Property 5: Same input, same verdicts", () => {
  it(
    "5.1 — runRules called twice gives identical results in member order",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            fc.tuple(arbRuleSet(schema), arbMembers(schema)),
          ),
          ([ruleSet, members]) => {
            const results1 = runRules(ruleSet, members);
            const results2 = runRules(ruleSet, members);

            // Both calls must return identical results.
            expect(results1).toEqual(results2);

            // Exactly one verdict per member.
            expect(results1).toHaveLength(members.length);

            // Each verdict corresponds to its member in list order.
            results1.forEach((r, i) => {
              expect(r.memberId).toBe(members[i]!.id);
            });
          },
        ),
        { numRuns: 200 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 5.3 — Shuffling key order inside objects gives the same verdicts
  //
  // For any valid rule set, serialising it, reversing the key order at every
  // object level, then re-parsing with parseRules must succeed and produce a
  // rule set whose verdicts on any member list are identical to those of the
  // original rule set.
  //
  // Key ordering in JSON objects is not meaningful, so the engine must be
  // insensitive to it.
  //
  // Validates: Requirement 5.3
  // ---------------------------------------------------------------------------

  it(
    "5.3 — reversing key order throughout the JSON object gives the same verdicts",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            fc.tuple(
              fc.constant(schema),
              arbRuleSet(schema),
              arbMembers(schema),
            ),
          ),
          ([schema, ruleSet, members]) => {
            // Convert the rule set to a plain JSON object (the parseRules input format).
            const plainInput = ruleSetToInput(ruleSet);

            // Reverse the key order throughout the object tree.
            const shuffled = reverseKeys(plainInput);

            // Re-parse with the same schema.
            const result = parseRules(shuffled, schema);

            // Must parse successfully — key order must not cause validation failure.
            expect(result.ok).toBe(true);
            if (!result.ok) return; // type narrowing; assertion above already fails

            // The reparsed rule set must produce the same verdicts on the same members.
            const verdicts1 = runRules(ruleSet, members);
            const verdicts2 = runRules(result.ruleSet, members);

            expect(verdicts1).toEqual(verdicts2);
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});
