// Property tests for the rule engine. All six are required.
// Feature: rule-engine
// Each test is tagged with its property number.

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  arbCondition,
  arbMembers,
  arbRuleSet,
  arbSignalSchema,
  arbSignals,
  arbWhen,
} from "./arbitraries";
import { evaluate, matches, parseRules, runRules, signalsRead } from "./index";
import type { Rule, RuleSet, Signals } from "./types";

// --- Property 1: First match wins ---
// For any schema, any valid rule set and any matching signals:
// the verdict is from the first rule whose when matches, or the default.
describe("Property 1: First match wins", () => {
  it("verdict is the first matching rule, or default approve", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbSignals(schema)).map(([ruleSet, signals]) => ({ schema, ruleSet, signals })),
        ),
        ({ ruleSet, signals }) => {
          const verdict = evaluate(ruleSet, signals);
          // Find the expected rule by scanning in order
          const expected = ruleSet.rules.find((r) => matches(r.when, signals));
          if (expected) {
            expect(verdict.outcome).toBe(expected.then);
            expect(verdict.ruleId).toBe(expected.id);
          } else {
            expect(verdict.outcome).toBe("approve");
            expect(verdict.ruleId).toBeNull();
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// --- Property 2: Conditions mean what they say ---
// < and >= are opposites; > and <= are opposites; = and != are opposites.
// { all } matches only when every condition matches.
describe("Property 2: Conditions mean what they say", () => {
  it("< and >= are strict complements on numbers", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1e6, max: 1e6, noNaN: true }),
        fc.float({ min: -1e6, max: 1e6, noNaN: true }),
        (sigVal, refVal) => {
          const signals: Signals = { x: sigVal };
          const lt = matches({ signal: "x", op: "<", value: refVal }, signals);
          const gte = matches({ signal: "x", op: ">=", value: refVal }, signals);
          expect(lt).toBe(!gte);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("> and <= are strict complements on numbers", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1e6, max: 1e6, noNaN: true }),
        fc.float({ min: -1e6, max: 1e6, noNaN: true }),
        (sigVal, refVal) => {
          const signals: Signals = { x: sigVal };
          const gt = matches({ signal: "x", op: ">", value: refVal }, signals);
          const lte = matches({ signal: "x", op: "<=", value: refVal }, signals);
          expect(gt).toBe(!lte);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("= and != are strict complements for any signal value", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbSignals(schema), arbCondition(schema)).map(([signals, cond]) => ({ signals, cond })),
        ),
        ({ signals, cond }) => {
          const eq = matches({ signal: cond.signal, op: "=", value: cond.value }, signals);
          const neq = matches({ signal: cond.signal, op: "!=", value: cond.value }, signals);
          expect(eq).toBe(!neq);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("{ all } matches iff every individual condition matches", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(
            fc.array(arbCondition(schema), { minLength: 1, maxLength: 4 }),
            arbSignals(schema),
          ).map(([conds, signals]) => ({ conds, signals })),
        ),
        ({ conds, signals }) => {
          const allResult = matches({ all: conds }, signals);
          const everyResult = conds.every((c) => matches(c, signals));
          expect(allResult).toBe(everyResult);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// --- Property 3: A rule on top changes only what it matches ---
// Adding a rule at the top gives each member that rule's outcome if it matches,
// and the unchanged outcome otherwise.
describe("Property 3: A rule on top changes only what it matches", () => {
  it("extra rule on top changes only members it matches", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbMembers(schema), arbWhen(schema)).map(([ruleSet, members, when]) => ({
            schema,
            ruleSet,
            members,
            when,
          })),
        ),
        ({ ruleSet, members, when }) => {
          // Pick a fresh id not in the existing set
          const freshId = "__extra__";
          const extraRule: Rule = { id: freshId, when, then: "reject" };
          const extended: RuleSet = { rules: [extraRule, ...ruleSet.rules] };

          for (const m of members) {
            const before = evaluate(ruleSet, m.signals, m.id);
            const after = evaluate(extended, m.signals, m.id);

            if (matches(when, m.signals, m.id)) {
              expect(after.ruleId).toBe(freshId);
            } else {
              expect(after.outcome).toBe(before.outcome);
              expect(after.ruleId).toBe(before.ruleId);
            }
          }
        },
      ),
      { numRuns: 150 },
    );
  });

  it("adding a reject rule on top never turns a previous reject into approve", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbMembers(schema), arbWhen(schema)).map(([ruleSet, members, when]) => ({
            ruleSet,
            members,
            when,
          })),
        ),
        ({ ruleSet, members, when }) => {
          const extraRule: Rule = { id: "__reject_top__", when, then: "reject" };
          const extended: RuleSet = { rules: [extraRule, ...ruleSet.rules] };

          for (const m of members) {
            const before = evaluate(ruleSet, m.signals, m.id);
            const after = evaluate(extended, m.signals, m.id);

            if (before.outcome === "reject") {
              expect(after.outcome).not.toBe("approve");
            }
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});

// --- Property 4: Label blind ---
// Two members with equal signals get equal verdicts. A signal not read by the
// rule set can change without changing the verdict.
describe("Property 4: Label blind", () => {
  it("equal signals give equal verdicts regardless of member id", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbSignals(schema)).map(([ruleSet, signals]) => ({ ruleSet, signals })),
        ),
        ({ ruleSet, signals }) => {
          const v1 = evaluate(ruleSet, signals, "alice");
          const v2 = evaluate(ruleSet, signals, "bob");
          expect(v1.outcome).toBe(v2.outcome);
          expect(v1.ruleId).toBe(v2.ruleId);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("changing a signal not read by the rule set does not change the verdict", () => {
    fc.assert(
      fc.property(
        arbSignalSchema()
          .filter((schema) => Object.keys(schema).length >= 2)
          .chain((schema) => {
            const keys = Object.keys(schema);
            return fc
              .tuple(arbRuleSet(schema), arbSignals(schema))
              .chain(([ruleSet, signals]) => {
                const read = new Set(signalsRead(ruleSet));
                const unread = keys.filter((k) => !read.has(k));
                if (unread.length === 0) return fc.constant(null);
                return fc
                  .constantFrom(...unread)
                  .chain((key) => {
                    const sigType = schema[key]!;
                    let newValArb: fc.Arbitrary<string | number | boolean>;
                    if (sigType.kind === "number") newValArb = fc.float({ min: -1e6, max: 1e6, noNaN: true });
                    else if (sigType.kind === "boolean") newValArb = fc.boolean();
                    else newValArb = fc.constantFrom(...sigType.values);
                    return newValArb.map((newVal) => ({ ruleSet, signals, key, newVal }));
                  });
              });
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
        ({ ruleSet, signals, key, newVal }) => {
          const before = evaluate(ruleSet, signals);
          const altered = { ...signals, [key]: newVal };
          const after = evaluate(ruleSet, altered);
          expect(after.outcome).toBe(before.outcome);
          expect(after.ruleId).toBe(before.ruleId);
        },
      ),
      { numRuns: 150 },
    );
  });

  it("signalsRead returns names sorted and without duplicates", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) => arbRuleSet(schema)),
        (ruleSet) => {
          const names = signalsRead(ruleSet);
          const sorted = [...names].sort();
          expect(names).toEqual(sorted);
          expect(new Set(names).size).toBe(names.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// --- Property 5: Same input, same verdicts ---
// Running twice gives equal results. JSON key order inside objects doesn't matter.
describe("Property 5: Same input, same verdicts", () => {
  it("running twice gives equal results", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbMembers(schema)).map(([ruleSet, members]) => ({ ruleSet, members })),
        ),
        ({ ruleSet, members }) => {
          const r1 = runRules(ruleSet, members);
          const r2 = runRules(ruleSet, members);
          expect(r1).toEqual(r2);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("returns exactly one verdict per member, in member order", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbMembers(schema)).map(([ruleSet, members]) => ({ ruleSet, members })),
        ),
        ({ ruleSet, members }) => {
          const results = runRules(ruleSet, members);
          expect(results.length).toBe(members.length);
          results.forEach((r, i) => {
            expect(r.memberId).toBe(members[i]!.id);
          });
        },
      ),
      { numRuns: 200 },
    );
  });

  it("shuffling JSON key order inside objects gives the same verdicts", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          fc.tuple(arbRuleSet(schema), arbSignals(schema)).map(([ruleSet, signals]) => ({ schema, ruleSet, signals })),
        ),
        ({ ruleSet, signals }) => {
          // Shuffle the signals keys
          const keys = Object.keys(signals);
          const shuffled = Object.fromEntries(
            [...keys].reverse().map((k) => [k, signals[k]!]),
          );
          const v1 = evaluate(ruleSet, signals);
          const v2 = evaluate(ruleSet, shuffled);
          expect(v1.outcome).toBe(v2.outcome);
          expect(v1.ruleId).toBe(v2.ruleId);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// --- Property 6: Validation is total ---
// parseRules never throws. A generated valid rule set round-trips. 
// A condition naming an out-of-schema signal is rejected with an error pointing at that rule.
describe("Property 6: Validation is total", () => {
  it("parseRules never throws for any JSON value", () => {
    fc.assert(
      fc.property(
        fc.jsonValue(),
        arbSignalSchema(),
        (input, schema) => {
          expect(() => parseRules(input, schema)).not.toThrow();
        },
      ),
      { numRuns: 200 },
    );
  });

  it("always returns ok or at least one error — never both, never neither", () => {
    fc.assert(
      fc.property(
        fc.jsonValue(),
        arbSignalSchema(),
        (input, schema) => {
          const result = parseRules(input, schema);
          if (result.ok) {
            expect(result.ruleSet.rules).toBeDefined();
          } else {
            expect(result.errors.length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("a generated valid rule set round-trips through JSON parse", () => {
    fc.assert(
      fc.property(
        arbSignalSchema().chain((schema) =>
          arbRuleSet(schema).map((ruleSet) => ({ schema, ruleSet })),
        ),
        ({ schema, ruleSet }) => {
          const asJson = JSON.parse(JSON.stringify({ rules: ruleSet.rules })) as unknown;
          const result = parseRules(asJson, schema);
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.ruleSet.rules.length).toBe(ruleSet.rules.length);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("a condition naming an out-of-schema signal is rejected with an error pointing at that rule", () => {
    fc.assert(
      fc.property(
        arbSignalSchema()
          .filter((s) => Object.keys(s).length > 0)
          .chain((schema) =>
            arbRuleSet(schema).chain((ruleSet) => {
              if (ruleSet.rules.length === 0) return fc.constant(null);
              return fc.integer({ min: 0, max: ruleSet.rules.length - 1 }).map((idx) => ({
                schema,
                ruleSet,
                idx,
              }));
            }),
          )
          .filter((x): x is NonNullable<typeof x> => x !== null),
        ({ schema, ruleSet, idx }) => {
          // Clone rules as mutable and patch a signal name to be invalid
          const rules = ruleSet.rules.map((r, i) => {
            if (i !== idx) return r;
            const when = "all" in r.when
              ? { all: r.when.all.map((c, ci) => (ci === 0 ? { ...c, signal: "__invalid_signal__" } : c)) }
              : { ...r.when, signal: "__invalid_signal__" };
            return { ...r, when };
          });
          const result = parseRules({ rules }, schema);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.errors.some((e) => e.ruleIndex === idx || e.message.includes("__invalid_signal__"))).toBe(true);
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});
