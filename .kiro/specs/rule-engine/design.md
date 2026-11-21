# Design Document: Rule Engine

## Overview

The rule engine lives in `packages/core/src/rules/`. It is pure TypeScript: no DOM, no Node built-ins, no clock, no randomness. It knows nothing about Igor or Salt Circle. A world tells it which signals exist by passing a signal schema.

It does three things:

1. `parseRules` validates a rules input against a signal schema and returns a rule set or a list of errors.
2. `evaluate` and `runRules` give verdicts: the first matching rule wins, the default is approve, and every verdict names its rule.
3. `signalsRead` lists the signals a rule set reads. The autopsy uses this later to find the signal no rule reads.

This is the first spec in the repo, so its tasks also set up the npm workspace root, TypeScript in strict mode, Vitest, fast-check, Zod and the `@rip/core` package. Nothing else is set up here: no apps, no CLI, no rule packs.

## Architecture

```
rules input (unknown) + SignalSchema ──parseRules──▶ RuleSet | RuleError[]
RuleSet + Signals                    ──evaluate────▶ Verdict
RuleSet + members                    ──runRules────▶ one verdict per member, in order
RuleSet                              ──signalsRead─▶ signal names
```

Files:

```
packages/core/src/rules/types.ts          types below
packages/core/src/rules/parse.ts          parseRules, built on Zod
packages/core/src/rules/evaluate.ts       matches, evaluate, runRules, signalsRead
packages/core/src/rules/arbitraries.ts    fast-check arbitraries, reused by later specs
packages/core/src/rules/index.ts          public exports
packages/core/src/rules/*.test.ts         example tests
packages/core/src/rules/*.prop.test.ts    property tests
```

## Components and Interfaces

```ts
export type SignalValue = number | boolean | string;
export type Signals = Readonly<Record<string, SignalValue>>;

export type SignalType =
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly string[] };
export type SignalSchema = Readonly<Record<string, SignalType>>;

export type Outcome = "reject" | "review" | "approve";
export type Op = "=" | "!=" | "<" | "<=" | ">" | ">=";

export interface Condition { signal: string; op: Op; value: SignalValue }
export type When = Condition | { all: readonly Condition[] };
export interface Rule { id: string; when: When; then: Outcome }
export interface RuleSet { rules: readonly Rule[] }

/** ruleId is null when the verdict is the default. */
export interface Verdict { outcome: Outcome; ruleId: string | null }

export interface RuleError { ruleIndex: number | null; ruleId: string | null; message: string }
export type ParseResult =
  | { ok: true; ruleSet: RuleSet }
  | { ok: false; errors: RuleError[] };

export const DEFAULT_OUTCOME: Outcome = "approve";

export function parseRules(input: unknown, schema: SignalSchema): ParseResult;
export function matches(when: When, signals: Signals): boolean;
export function evaluate(ruleSet: RuleSet, signals: Signals): Verdict;
export function runRules(
  ruleSet: RuleSet,
  members: readonly { id: string; signals: Signals }[],
): { memberId: string; verdict: Verdict }[];
export function signalsRead(ruleSet: RuleSet): string[];
```

Notes:

- `parseRules` is the only way to get a `RuleSet`. `evaluate` assumes its rule set came from there.
- `runRules` takes `{ id, signals }` and nothing more. A world's member has more fields, such as its truth label, and can be passed as it is, but the engine's types cannot see them. This is how "label blind" is kept.
- `signalsRead` returns names sorted and without duplicates, so its result is stable.
- Objects and conditions are strict: an unknown key is an error, so a misspelled key is never silently ignored.

## Data Models

A rules file:

```json
{
  "rules": [
    { "id": "low-score", "when": { "signal": "score", "op": "<", "value": 40 }, "then": "reject" },
    {
      "id": "new-and-remote",
      "when": { "all": [
        { "signal": "zone", "op": "=", "value": "remote" },
        { "signal": "ageDays", "op": "<", "value": 3 }
      ] },
      "then": "review"
    }
  ]
}
```

A signal schema for it, supplied by the world:

```ts
const schema: SignalSchema = {
  score: { kind: "number" },
  ageDays: { kind: "number" },
  flagged: { kind: "boolean" },
  zone: { kind: "enum", values: ["local", "remote"] },
};
```

Rules for values:

- A number signal takes a finite number and any operator.
- A boolean signal takes `true` or `false`, with `=` or `!=` only.
- An enum signal takes one of its listed values, with `=` or `!=` only. A value outside the list is an error, so a typo is caught at load.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system. Properties are the bridge between the written requirements and tests a machine can check.*

### Property 1: First match wins

*For any* signal schema, any valid rule set and any signals that fit the schema, the verdict is that of the first rule in list order whose `when` matches: the outcome is that rule's `then` and `ruleId` is its id. If no rule matches, the verdict is `approve` with `ruleId` null.

**Validates: Requirements 2.1, 2.2, 3.1, 3.2**

### Property 2: Conditions mean what they say

*For any* number signal value and any rule value, `<` and `>=` give opposite answers, and so do `>` and `<=`. *For any* signal value of any type, `=` and `!=` give opposite answers. *For any* list of conditions, `{ all }` matches exactly when every condition in the list matches.

**Validates: Requirements 2.3, 2.4**

### Property 3: A rule on top changes only what it matches

*For any* valid rule set, any extra rule with a fresh id, and any signals: with the extra rule placed on top, the verdict is the extra rule's own if it matches, and the unchanged verdict if it does not. So when the extra rule is a reject rule, no member's outcome goes from `reject` to `approve`.

**Validates: Requirements 2.6, 2.7**

### Property 4: Label blind

*For any* valid rule set and any two members whose signals are equal, the verdicts are equal, whatever their ids, truth labels or other fields are. *For any* signal that is not in `signalsRead(ruleSet)`, changing its value does not change the verdict.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: Same input, same verdicts

*For any* valid rule set and any list of members, running twice gives equal results, with exactly one verdict per member in member order. *For any* valid rules input, shuffling the order of the keys inside its objects gives the same verdicts.

**Validates: Requirements 3.3, 5.1, 5.3**

### Property 6: Validation is total

*For any* JSON value, `parseRules` returns without throwing, and returns either a rule set or at least one error. *For any* generated valid rule set, parsing its JSON form succeeds and gives back an equal rule set. *For any* valid rules input changed so that one condition names a signal outside the schema, `parseRules` fails with an error that points at that rule.

**Validates: Requirements 1.1, 1.4, 1.7**

## Error Handling

- `parseRules` never throws. It collects every error and returns them together, each with the rule's position, its id when it has one, and a message in plain words. There is no partial rule set.
- `evaluate` throws when a condition it is testing reads a signal the member does not have. The error names the signal.
- `runRules` adds the member's id to that error and returns no results at all for that run. A missing signal is a bug in a world, and it must never look like "no rule matched".

## Testing Strategy

Property tests in this spec are required tasks, not optional ones. The spec is done when `npx vitest run` passes with all six.

### Property tests (fast-check, `*.prop.test.ts`)

One test per property above, at least 100 runs each, tagged in a comment as `Feature: rule-engine, Property N: <name>`.

`arbitraries.ts` provides the generators: a signal schema, a valid rule set for a schema, signals that fit a schema, and a member list. Later specs reuse them.

Property 1 uses `matches` to find the expected rule, so `matches` is tested on its own by Property 2 and by the examples below.

### Example tests (Vitest, `*.test.ts`)

- The rules file from Data Models, against members that hit each rule and the default.
- At the boundary: `score < 40` with a score of exactly 40 does not match; `ageDays >= 3` with exactly 3 matches.
- An empty `rules` list approves everyone by default.
- An early `approve` rule shields a member from a later `reject` rule.
- Rejected at load: an empty `all`, a duplicate id, an empty id, an unknown key, an unknown signal, an enum value outside the list, `<` on a boolean, a `then` outside the three outcomes.
- Two errors in one file are both reported.
- A member missing a signal that a rule reads stops the run with an error naming the member and the signal.
