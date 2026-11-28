// fast-check arbitraries for the rule engine. Reused by later specs.
//
// Kept cheap on purpose: names come from fixed pools and numbers are small
// integers, so generation never spends time rejecting and retrying strings.

import * as fc from "fast-check";
import type { Condition, Op, Outcome, Rule, RuleSet, SignalSchema, SignalType, SignalValue, Signals, When } from "./types";

const SIGNAL_NAMES = ["score", "ageDays", "count", "flagged", "zone", "kind", "level", "total"] as const;
const ENUM_VALUES = ["alpha", "beta", "gamma", "delta", "local", "remote"] as const;

// --- Signal schema ---

export const arbSignalType = (): fc.Arbitrary<SignalType> =>
  fc.oneof(
    fc.constant({ kind: "number" as const }),
    fc.constant({ kind: "boolean" as const }),
    fc
      .uniqueArray(fc.constantFrom(...ENUM_VALUES), { minLength: 1, maxLength: 4 })
      .map((values) => ({ kind: "enum" as const, values: values as readonly string[] })),
  );

export const arbSignalSchema = (): fc.Arbitrary<SignalSchema> =>
  fc
    .uniqueArray(fc.constantFrom(...SIGNAL_NAMES), { minLength: 1, maxLength: 5 })
    .chain((names) =>
      fc
        .tuple(...names.map(() => arbSignalType()))
        .map((types) => Object.fromEntries(names.map((n, i) => [n, types[i]!])) as SignalSchema),
    );

// --- Signals that fit a schema ---

const arbNumber = (): fc.Arbitrary<number> => fc.integer({ min: -100, max: 100 });

function arbValueForType(t: SignalType): fc.Arbitrary<SignalValue> {
  if (t.kind === "number") return arbNumber();
  if (t.kind === "boolean") return fc.boolean();
  return fc.constantFrom(...t.values);
}

export const arbSignals = (schema: SignalSchema): fc.Arbitrary<Signals> => {
  const entries = Object.entries(schema);
  if (entries.length === 0) return fc.constant({});
  return fc
    .tuple(...entries.map(([, t]) => arbValueForType(t)))
    .map((vals) => Object.fromEntries(entries.map(([k], i) => [k, vals[i]!])) as Signals);
};

// --- Conditions and rules ---

function arbOpForType(t: SignalType): fc.Arbitrary<Op> {
  if (t.kind === "number") return fc.constantFrom("=", "!=", "<", "<=", ">", ">=");
  return fc.constantFrom("=", "!=");
}

export const arbCondition = (schema: SignalSchema): fc.Arbitrary<Condition> => {
  const entries = Object.entries(schema);
  if (entries.length === 0) {
    return fc.constant({ signal: "__none__", op: "=" as Op, value: 0 });
  }
  return fc.constantFrom(...entries).chain(([signal, type]) =>
    fc.tuple(arbOpForType(type), arbValueForType(type)).map(([op, value]) => ({ signal, op, value })),
  );
};

export const arbWhen = (schema: SignalSchema): fc.Arbitrary<When> =>
  fc.oneof(
    arbCondition(schema),
    fc.array(arbCondition(schema), { minLength: 1, maxLength: 3 }).map((all) => ({ all })),
  );

const arbOutcome = (): fc.Arbitrary<Outcome> => fc.constantFrom("reject", "review", "approve");

/** A valid rule set for a schema. Rule ids are unique: r0, r1, r2 ... */
export const arbRuleSet = (schema: SignalSchema): fc.Arbitrary<RuleSet> =>
  fc
    .array(fc.tuple(arbWhen(schema), arbOutcome()), { minLength: 0, maxLength: 6 })
    .map((items) => ({
      rules: items.map(([when, then], i) => ({ id: `r${i}`, when, then }) as Rule),
    }));

// --- Members ---

export const arbMembers = (schema: SignalSchema): fc.Arbitrary<readonly { id: string; signals: Signals }[]> =>
  fc
    .array(arbSignals(schema), { minLength: 0, maxLength: 10 })
    .map((list) => list.map((signals, i) => ({ id: `m${i}`, signals })));
