// Feature: rule-engine, Property 1: First match wins

import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { arbSignalSchema, arbRuleSet, arbSignals } from "./arbitraries.js";
import { evaluate, matches } from "./evaluate.js";

describe("Property 1: First match wins", () => {
  it("verdict matches the first matching rule, or default approve", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbSignals(schema)),
        ),
        ([ruleSet, signals]) => {
          const verdict = evaluate(ruleSet, signals);

          // Find the first matching rule manually
          const firstMatch = ruleSet.rules.find((rule) =>
            matches(rule.when, signals),
          );

          if (firstMatch) {
            expect(verdict.outcome).toBe(firstMatch.then);
            expect(verdict.ruleId).toBe(firstMatch.id);
          } else {
            expect(verdict.outcome).toBe("approve");
            expect(verdict.ruleId).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
