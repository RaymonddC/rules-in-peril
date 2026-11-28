// Feature: rule-engine, Property 6: Validation is total

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { arbRuleSet, arbSignalSchema } from "./arbitraries.js";
import { parseRules } from "./parse.js";
import type { ParseResult } from "./types.js";

// ---------------------------------------------------------------------------
// Property 6.1 — parseRules never throws for any JavaScript value
//
// For any JavaScript value passed as the first argument and any valid signal
// schema as the second: parseRules returns without throwing. When it returns
// a failure, there is at least one error in the list.
//
// Validates: Requirement 1.1
// ---------------------------------------------------------------------------

describe("Property 6: Validation is total", () => {
  it(
    "6.1 — parseRules never throws for any JavaScript value",
    { timeout: 30_000 },
    () => {
      // Input A: fc.anything() — the original broad fuzz
      fc.assert(
        fc.property(
          fc.tuple(fc.anything(), arbSignalSchema()),
          ([input, schema]) => {
            let result: ParseResult | undefined;
            expect(() => {
              result = parseRules(input, schema);
            }).not.toThrow();
            if (result !== undefined && !result.ok) {
              expect(result.errors.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: 200 },
      );

      // Input B: an object with a rules array of arbitrary values
      fc.assert(
        fc.property(
          fc.tuple(
            fc.record({ rules: fc.array(fc.anything()) }),
            arbSignalSchema(),
          ),
          ([input, schema]) => {
            let result: ParseResult | undefined;
            expect(() => {
              result = parseRules(input, schema);
            }).not.toThrow();
            if (result !== undefined && !result.ok) {
              expect(result.errors.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: 200 },
      );

      // Input C: a rule-shaped object where id, when, and then are arbitrary
      fc.assert(
        fc.property(
          fc.tuple(
            fc.record({
              rules: fc.array(
                fc.record({
                  id: fc.anything(),
                  when: fc.anything(),
                  then: fc.anything(),
                }),
              ),
            }),
            arbSignalSchema(),
          ),
          ([input, schema]) => {
            let result: ParseResult | undefined;
            expect(() => {
              result = parseRules(input, schema);
            }).not.toThrow();
            if (result !== undefined && !result.ok) {
              expect(result.errors.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: 200 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 6.2 — Any generated valid rule set round-trips through JSON
  //
  // For any valid rule set, serialising it to JSON and re-parsing with
  // parseRules must succeed and return a rule set that equals the original.
  //
  // Validates: Requirement 1.1, 1.7
  // ---------------------------------------------------------------------------

  it(
    "6.2 — a valid rule set round-trips through JSON unchanged",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            fc.tuple(fc.constant(schema), arbRuleSet(schema)),
          ),
          ([schema, ruleSet]) => {
            const asJson = JSON.parse(JSON.stringify(ruleSet));
            const result = parseRules(asJson, schema);
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.ruleSet).toEqual(ruleSet);
            }
          },
        ),
        { numRuns: 200 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 6.3 — Mutating a valid input to use an unknown signal causes a
  //                parse failure pointing at that rule
  //
  // For any valid rules input that has at least one rule: replace the first
  // rule's condition signal name with a signal that is not in the schema.
  // Draws the bad signal name from two sources with equal probability:
  //   - an inherited prototype name (constructor, toString, etc.)
  //   - a random string that is not a key in the schema
  // Varies the placement of the bad condition between direct and all-wrapped.
  // parseRules must return a failure, and at least one error must carry
  // ruleIndex 0.
  //
  // Validates: Requirement 1.4
  // ---------------------------------------------------------------------------

  it(
    "6.3 — a condition with an unknown signal name causes a parse failure at the right rule",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            arbRuleSet(schema)
              .filter((rs) => rs.rules.length > 0)
              .chain((ruleSet) =>
                fc.tuple(
                  fc.constant(schema),
                  fc.constant(ruleSet),
                  // bad signal name: inherited prototype name OR unknown random string
                  fc.oneof(
                    fc.constantFrom(
                      "constructor",
                      "toString",
                      "__proto__",
                      "hasOwnProperty",
                    ),
                    fc.string().filter((s) => !Object.hasOwn(schema, s)),
                  ),
                  // placement: direct condition or inside an all list
                  fc.oneof(
                    fc.constant("direct" as const),
                    fc.constant("all" as const),
                  ),
                ),
              ),
          ),
          ([schema, ruleSet, badSignal, placement]) => {
            const firstRule = ruleSet.rules[0]!;
            const badCondition = { signal: badSignal, op: "=" as const, value: 0 };
            const badWhen =
              placement === "direct"
                ? badCondition
                : { all: [badCondition] };
            const badRule = { ...firstRule, when: badWhen };
            const badRuleSet = { rules: [badRule, ...ruleSet.rules.slice(1)] };

            const result = parseRules(badRuleSet, schema);
            expect(result.ok).toBe(false);
            if (!result.ok) {
              const hasErrorAtRule0 = result.errors.some((e) => e.ruleIndex === 0);
              expect(hasErrorAtRule0).toBe(true);
            }
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});
