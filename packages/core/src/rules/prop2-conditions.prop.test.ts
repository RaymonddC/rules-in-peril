// Feature: rule-engine, Property 2: Conditions mean what they say

import * as fc from "fast-check";
import { describe, it } from "vitest";
import { matches } from "./evaluate.js";
import type { Condition, Op, Signals, When } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignals(signal: string, value: number | boolean | string): Signals {
  return { [signal]: value };
}

function makeCondition(
  signal: string,
  op: Condition["op"],
  value: Condition["value"],
): Condition {
  return { signal, op, value };
}

// ---------------------------------------------------------------------------
// Property 2.1 — `<` and `>=` are complementary for numbers
// Validates: Requirements 2.3, 2.4
// ---------------------------------------------------------------------------

describe("Property 2: Conditions mean what they say", () => {
  it(
    "2.1 — `<` and `>=` are complementary for numbers",
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10, max: 10 }), // signal value
          fc.integer({ min: -10, max: 10 }), // condition value
          (sigVal, condVal) => {
            const signals = makeSignals("n", sigVal);
            const ltCond = makeCondition("n", "<", condVal);
            const gteCond = makeCondition("n", ">=", condVal);

            const ltResult = matches(ltCond, signals);
            const gteResult = matches(gteCond, signals);

            return ltResult !== gteResult;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 2.2 — `>` and `<=` are complementary for numbers
  // Validates: Requirements 2.3, 2.4
  // ---------------------------------------------------------------------------

  it(
    "2.2 — `>` and `<=` are complementary for numbers",
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10, max: 10 }), // signal value
          fc.integer({ min: -10, max: 10 }), // condition value
          (sigVal, condVal) => {
            const signals = makeSignals("n", sigVal);
            const gtCond = makeCondition("n", ">", condVal);
            const lteCond = makeCondition("n", "<=", condVal);

            const gtResult = matches(gtCond, signals);
            const lteResult = matches(lteCond, signals);

            return gtResult !== lteResult;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 2.3 — `=` and `!=` are complementary for any value
  // Validates: Requirements 2.3, 2.4
  // ---------------------------------------------------------------------------

  it(
    "2.3 — `=` and `!=` are complementary for any value",
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -10, max: 10 }),
            fc.boolean(),
            fc.constantFrom("a", "b", "c"),
          ),
          fc.oneof(
            fc.integer({ min: -10, max: 10 }),
            fc.boolean(),
            fc.constantFrom("a", "b", "c"),
          ),
          (sigVal, condVal) => {
            const signals = makeSignals("x", sigVal);
            const eqCond = makeCondition("x", "=", condVal);
            const neqCond = makeCondition("x", "!=", condVal);

            const eqResult = matches(eqCond, signals);
            const neqResult = matches(neqCond, signals);

            return eqResult !== neqResult;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 2.4 — `{ all }` matches iff every condition in the list matches
  // Validates: Requirements 2.3, 2.4
  // ---------------------------------------------------------------------------

  it(
    "2.4 — `{ all }` matches iff every individual condition matches",
    () => {
      // Build a schema-like structure: generate 1-3 number conditions
      // using a fixed signal name pool so the signals map is well-defined.
      const signalNames = ["a", "b", "c"] as const;

      fc.assert(
        fc.property(
          // signals map for a, b, c
          fc.record({
            a: fc.integer({ min: -10, max: 10 }),
            b: fc.integer({ min: -10, max: 10 }),
            c: fc.integer({ min: -10, max: 10 }),
          }),
          // 1-3 conditions, each referencing one of the three signals
          fc.array(
            fc.tuple(
              fc.constantFrom(...signalNames),
              fc.constantFrom<Op>("<", "<=", ">", ">=", "=", "!="),
              fc.integer({ min: -10, max: 10 }),
            ),
            { minLength: 1, maxLength: 3 },
          ),
          (signals, rawConditions) => {
            const conditions: Condition[] = rawConditions.map(([signal, op, value]) => ({
              signal,
              op,
              value,
            }));

            const allWhen: When = { all: conditions };
            const allResult = matches(allWhen, signals);
            const everyResult = conditions.every((c) => matches(c, signals));

            return allResult === everyResult;
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
