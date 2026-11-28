// Feature: rule-engine, Property 4: Label blind

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { arbRuleSet, arbSignalSchema, arbSignals } from "./arbitraries.js";
import { evaluate, runRules, signalsRead } from "./evaluate.js";
import type { SignalSchema, SignalType } from "./types.js";

// ---------------------------------------------------------------------------
// Property 4.1/4.2 — Two members with equal signals get equal verdicts
// regardless of their ids, truth labels, or any other fields.
//
// evaluate(ruleSet, signals) never receives an id — the signal map is the
// only input that can influence the verdict. We call it twice with the same
// signals to make this explicit.
//
// Validates: Requirements 4.1, 4.2
// ---------------------------------------------------------------------------

describe("Property 4: Label blind", () => {
  it(
    "4.1/4.2 — same signals → same verdict regardless of member id or label",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          arbSignalSchema().chain((schema) =>
            fc.tuple(arbRuleSet(schema), arbSignals(schema)),
          ),
          ([ruleSet, signals]) => {
            // Build two members with different ids, different extra fields
            // (one labelled "villager", one "monster"), and signals that are
            // equal values but separate objects (not the same reference).
            const memberA = {
              id: "member-a",
              label: "villager" as const,
              signals: { ...signals },   // copy — separate object, same values
            };
            const memberB = {
              id: "member-b",
              label: "monster" as const,
              signals: { ...signals },   // copy — separate object, same values
            };

            // runRules only reads .id and .signals; label is an extra field it ignores.
            const results = runRules(ruleSet, [memberA, memberB]);

            expect(results).toHaveLength(2);
            expect(results[0]!.verdict).toEqual(results[1]!.verdict);
          },
        ),
        { numRuns: 200 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 4.3/4.4 — Changing a signal that the rule set does not read
  // leaves the verdict unchanged.
  //
  // Strategy: generate a schema with at least 2 signals. Split it into a
  // "rule sub-schema" (all but the last signal) and one "extra" signal that
  // the rule set is built from the sub-schema so it provably never reads the
  // extra signal. Then alter the extra signal's value and confirm the verdict
  // stays the same.
  //
  // Using fc.pre() on the result of signalsRead is a valid alternative, but
  // the split-schema approach gives a higher hit rate for small schemas.
  //
  // Validates: Requirements 4.3, 4.4
  // ---------------------------------------------------------------------------

  it(
    "4.3/4.4 — changing a signal not in signalsRead does not change the verdict",
    { timeout: 30_000 },
    () => {
      fc.assert(
        fc.property(
          // Generate a schema with at least 2 signals so we can split it.
          arbSignalSchema()
            .filter((schema) => Object.keys(schema).length >= 2)
            .chain((fullSchema) => {
              const keys = Object.keys(fullSchema);

              // The extra signal is the last key; the rule set uses all others.
              const extraKey = keys[keys.length - 1] as string;
              const extraType = fullSchema[extraKey] as SignalType;

              // Sub-schema used to generate the rule set — does not contain extraKey.
              const subSchema: SignalSchema = Object.fromEntries(
                keys.slice(0, -1).map((k) => [k, fullSchema[k] as SignalType]),
              );

              // An arbitrary that generates a replacement value for the extra signal.
              // It must be a valid value for extraType but we just need it to differ
              // at least sometimes — fc.pre() below filters runs where it stays the same.
              let altValueArb: fc.Arbitrary<number | boolean | string>;
              if (extraType.kind === "number") {
                altValueArb = fc.integer({ min: -10, max: 10 });
              } else if (extraType.kind === "boolean") {
                altValueArb = fc.boolean();
              } else {
                altValueArb = fc.constantFrom(...extraType.values);
              }

              return fc.tuple(
                arbRuleSet(subSchema),  // rule set built from sub-schema only
                arbSignals(fullSchema), // signals covering all keys including extra
                altValueArb,            // candidate replacement for the extra signal
              ).map(([ruleSet, signals, altValue]) => ({
                ruleSet,
                signals,
                extraKey,
                altValue,
              }));
            }),
          ({ ruleSet, signals, extraKey, altValue }) => {
            // Skip runs where the replacement value is the same as the current one
            // (changing to the same value is not a real change).
            fc.pre(altValue !== signals[extraKey]);

            // Confirm the extra signal is indeed not read by the rule set.
            const readSet = signalsRead(ruleSet);
            fc.pre(!readSet.includes(extraKey));

            const modifiedSignals = { ...signals, [extraKey]: altValue };

            const v1 = evaluate(ruleSet, signals);
            const v2 = evaluate(ruleSet, modifiedSignals);

            expect(v1).toEqual(v2);
          },
        ),
        { numRuns: 200 },
      );
    },
  );
});
