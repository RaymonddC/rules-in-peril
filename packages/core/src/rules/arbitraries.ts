import * as fc from "fast-check";
import type {
  Condition,
  Op,
  RuleSet,
  SignalSchema,
  SignalType,
  Signals,
  When,
} from "./types.js";

// ---------------------------------------------------------------------------
// Signal schema arbitrary
// ---------------------------------------------------------------------------

/** Short alphanumeric signal name, e.g. "a3", "score", "z". */
const arbSignalName = fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/).filter((s) => s.length >= 1);

/** One enum type with at least one distinct value. */
const arbEnumType: fc.Arbitrary<SignalType> = fc
  .uniqueArray(fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/), { minLength: 1, maxLength: 4 })
  .map((values) => ({ kind: "enum" as const, values }));

const arbSignalType: fc.Arbitrary<SignalType> = fc.oneof(
  fc.constant({ kind: "number" as const }),
  fc.constant({ kind: "boolean" as const }),
  arbEnumType,
);

/**
 * Generates a `SignalSchema` with at least one signal.
 * Signal names are short lowercase alphanumeric strings.
 */
export function arbSignalSchema(): fc.Arbitrary<SignalSchema> {
  return fc
    .uniqueArray(arbSignalName, { minLength: 1, maxLength: 5 })
    .chain((names) =>
      fc.tuple(...names.map(() => arbSignalType)).map((types) => {
        const schema: Record<string, SignalType> = {};
        for (let i = 0; i < names.length; i++) {
          const name = names[i];
          const type = types[i];
          if (name !== undefined && type !== undefined) {
            schema[name] = type;
          }
        }
        return schema as SignalSchema;
      }),
    );
}

// ---------------------------------------------------------------------------
// Signals arbitrary
// ---------------------------------------------------------------------------

function arbValueForType(type: SignalType): fc.Arbitrary<number | boolean | string> {
  if (type.kind === "number") return fc.integer({ min: -10, max: 10 });
  if (type.kind === "boolean") return fc.boolean();
  // enum — pick from the signal's own value list
  return fc.constantFrom(...type.values);
}

/**
 * Generates a `Signals` map with exactly the keys in `schema`.
 * Values are drawn from the small integer range −10..10 for numbers,
 * so numeric conditions fire regularly.
 */
export function arbSignals(schema: SignalSchema): fc.Arbitrary<Signals> {
  const keys = Object.keys(schema);
  if (keys.length === 0) return fc.constant({} as Signals);

  return fc
    .tuple(...keys.map((k) => arbValueForType(schema[k] as SignalType)))
    .map((values) => {
      const signals: Record<string, number | boolean | string> = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = values[i];
        if (key !== undefined && val !== undefined) {
          signals[key] = val;
        }
      }
      return signals as Signals;
    });
}

// ---------------------------------------------------------------------------
// Condition / When arbitraries
// ---------------------------------------------------------------------------

const numberOps: Op[] = ["=", "!=", "<", "<=", ">", ">="];
const equalityOps: Op[] = ["=", "!="];

function arbConditionForSignal(
  signal: string,
  type: SignalType,
): fc.Arbitrary<Condition> {
  if (type.kind === "number") {
    return fc.tuple(fc.constantFrom(...numberOps), fc.integer({ min: -10, max: 10 })).map(
      ([op, value]) => ({ signal, op, value }),
    );
  }
  if (type.kind === "boolean") {
    return fc.tuple(fc.constantFrom(...equalityOps), fc.boolean()).map(([op, value]) => ({
      signal,
      op,
      value,
    }));
  }
  // enum
  return fc
    .tuple(fc.constantFrom(...equalityOps), fc.constantFrom(...type.values))
    .map(([op, value]) => ({ signal, op, value }));
}

function arbCondition(schema: SignalSchema): fc.Arbitrary<Condition> {
  const entries = Object.entries(schema);
  return fc.constantFrom(...entries).chain(([signal, type]) =>
    arbConditionForSignal(signal, type),
  );
}

function arbWhen(schema: SignalSchema): fc.Arbitrary<When> {
  const singleCond = arbCondition(schema);
  const allCond: fc.Arbitrary<When> = fc
    .array(arbCondition(schema), { minLength: 1, maxLength: 3 })
    .map((conditions) => ({ all: conditions }));
  return fc.oneof(singleCond, allCond);
}

// ---------------------------------------------------------------------------
// RuleSet arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates a valid `RuleSet` for the given schema.
 * Includes empty rule sets, single-condition rules, and `{ all }` rules.
 * All ids are non-empty and unique; all signal names and values are schema-compatible.
 */
export function arbRuleSet(schema: SignalSchema): fc.Arbitrary<RuleSet> {
  // Generate 0–5 unique non-empty rule ids
  const arbIds = fc
    .uniqueArray(
      fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/).filter((s) => s.length >= 1),
      { minLength: 0, maxLength: 5 },
    );

  return arbIds.chain((ids) => {
    if (ids.length === 0) return fc.constant({ rules: [] as readonly import("./types.js").Rule[] });

    const arbOutcome = fc.constantFrom(
      "reject" as const,
      "review" as const,
      "approve" as const,
    );
    const arbRuleBody = fc.tuple(arbWhen(schema), arbOutcome);

    return fc
      .tuple(...ids.map(() => arbRuleBody))
      .map((bodies) => ({
        rules: ids.map((id, i) => {
          const body = bodies[i] as [When, import("./types.js").Outcome];
          return { id, when: body[0], then: body[1] };
        }),
      }));
  });
}

// ---------------------------------------------------------------------------
// Members arbitrary
// ---------------------------------------------------------------------------

/**
 * Generates a list of `{ id, signals }` members whose signals fit the schema.
 */
export function arbMembers(
  schema: SignalSchema,
): fc.Arbitrary<readonly { id: string; signals: Signals }[]> {
  const arbMemberId = fc
    .stringMatching(/^[a-z][a-z0-9]{0,7}$/)
    .filter((s) => s.length >= 1);

  return fc.array(
    fc.record({
      id: arbMemberId,
      signals: arbSignals(schema),
    }),
    { minLength: 0, maxLength: 5 },
  );
}
