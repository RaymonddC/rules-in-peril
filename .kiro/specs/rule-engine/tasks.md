# Implementation Plan: Rule Engine

## Overview

Add `packages/core` to the existing npm workspace and implement the rule engine: types, `parseRules`, `evaluate`/`runRules`/`matches`/`signalsRead`, public exports, fast-check arbitraries, example tests, and all six property tests. The npm workspace root and both apps in `apps/` are untouched.

## Tasks

- [x] 1. Add packages/core to the workspace
  - Create `packages/core/package.json` as an `@rip/core` workspace package with:
    - `dependencies`: `"zod": "^3.0.0"` (runtime)
    - `devDependencies`: `"vitest": "^4.1.0"`, `"fast-check": "^3.0.0"`, `"typescript": "^7.0.2"`
    - `scripts`: `"test": "vitest run"`, `"typecheck": "tsc -p ."`
  - Create `packages/core/tsconfig.json` extending the root `tsconfig.base.json`, setting `"lib": ["ES2022"]`, `"types": []`, and `"include": ["src"]` so only source files are type-checked and the DOM is excluded
  - If test tooling types (e.g. Vitest globals) are needed in tests, create a separate `packages/core/tsconfig.test.json` that extends the main tsconfig and re-enables only what the tests need — never add DOM or Node types to the main tsconfig
  - Create `packages/core/vitest.config.ts` pointing at the `src` directory
  - Run `npm install` from the repo root to link the new package
  - _Requirements: none (infrastructure)_

- [x] 2. Define core types
  - Create `packages/core/src/rules/types.ts` with all exported types and constants: `SignalValue`, `Signals`, `SignalType`, `SignalSchema`, `Outcome`, `Op`, `Condition`, `When`, `Rule`, `RuleSet`, `Verdict`, `RuleError`, `ParseResult`, and `DEFAULT_OUTCOME`
  - _Requirements: 1.2, 1.3, 2.1, 3.1, 3.2_

- [x] 3. Implement parseRules
  - Create `packages/core/src/rules/parse.ts`
  - Build a Zod schema that accepts the shape from Requirements 1.2 and 1.3, with strict (no extra keys) object shapes
  - Validate each rule independently so an error in one rule never hides an error in another; every error carries the rule's index in the `rules` array
  - After structural validation, check: signal names against the schema (Req 1.4), value types and operator compatibility (Req 1.5), empty ids and duplicate ids (Req 1.6)
  - Collect every error before returning; never throw (Req 1.1, 1.7)
  - Accept an empty `rules` list (Req 1.8)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 4. Implement evaluate, runRules, matches, and signalsRead
  - Create `packages/core/src/rules/evaluate.ts`
  - `matches(when, signals)` — evaluates a single `When` against a `Signals` map using the six operators
  - `evaluate(ruleSet, signals)` — iterates rules in order, returns the first match's outcome and id, or `{ outcome: "approve", ruleId: null }` on no match; throws with signal name on a missing signal
  - `runRules(ruleSet, members)` — maps `evaluate` over members in order; on a missing-signal error, adds the member id and re-throws, returning no results for that run
  - `signalsRead(ruleSet)` — returns sorted, deduplicated signal names from all conditions in the rule set
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

- [x] 5. Create public exports
  - Create `packages/core/src/rules/index.ts` re-exporting everything from `types.ts`, `parse.ts`, and `evaluate.ts`
  - _Requirements: (all, as the package entry point)_

- [x] 6. Create fast-check arbitraries
  - Create `packages/core/src/rules/arbitraries.ts`
  - `arbSignalSchema()` — generates a `SignalSchema` with at least one signal
  - `arbSignals(schema)` — generates a `Signals` map with exactly the keys in the schema, values fitting each type; draw number values from a small integer range (e.g. −10..10) so numeric conditions fire regularly; draw enum condition values from the signal's own value list (not arbitrary strings)
  - `arbRuleSet(schema)` — generates a valid `RuleSet` (all ids unique and non-empty, all signals in schema, all values type-compatible); must include empty rule sets, single-condition rules, and `{ all: [...] }` rules
  - `arbMembers(schema)` — generates a list of `{ id, signals }` members with signals that fit the schema
  - Export all arbitraries for reuse by later specs
  - _Requirements: (testing infrastructure for Properties 1–6)_

- [x] 7. Write example tests
  - Create `packages/core/src/rules/rules.test.ts`
  - Cover: the data-model rules file against members that hit each rule and the default; boundary values for `<` and `>=`; empty rules list approves all; early `approve` shields from later `reject`
  - Cover load errors: empty `all`, duplicate id, empty id, unknown key in object, unknown signal, enum value outside the list, `<` on a boolean, invalid `then`
  - Cover two errors in one file both reported
  - Cover a missing signal stopping the run with an error naming the member and the signal
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3_

- [x] 8. Property test 1 — First match wins
  - Create `packages/core/src/rules/prop1-first-match.prop.test.ts`
  - Tag: `// Feature: rule-engine, Property 1: First match wins`
  - For any schema, valid rule set, and matching signals: the verdict equals the first rule in list order whose `when` matches, or `approve`/`null` if none match; at least 100 runs
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [x] 9. Property test 2 — Conditions mean what they say
  - Create `packages/core/src/rules/prop2-conditions.prop.test.ts`
  - Tag: `// Feature: rule-engine, Property 2: Conditions mean what they say`
  - For number values: `<` and `>=` are complementary, as are `>` and `<=`; for any value: `=` and `!=` are complementary; for any condition list: `{ all }` matches iff every condition matches; at least 100 runs
  - _Requirements: 2.3, 2.4_

- [x] 10. Property test 3 — A rule on top changes only what it matches
  - Create `packages/core/src/rules/prop3-prepend-rule.prop.test.ts`
  - Tag: `// Feature: rule-engine, Property 3: A rule on top changes only what it matches`
  - For any valid rule set and any extra rule with a fresh id prepended: if the extra rule matches, the verdict is the extra rule's; if it does not match, the verdict is unchanged from the original rule set; at least 100 runs
  - Assert explicitly: when the prepended rule is a `reject` rule, every member that was rejected by the original rule set is still rejected after the prepend
  - _Requirements: 2.6, 2.7_

- [x] 11. Property test 4 — Label blind
  - Create `packages/core/src/rules/prop4-label-blind.prop.test.ts`
  - Tag: `// Feature: rule-engine, Property 4: Label blind`
  - For any valid rule set: two members with equal signals get equal verdicts regardless of id, truth label, or other fields; changing a signal not in `signalsRead` does not change the verdict; at least 100 runs
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 12. Property test 5 — Same input, same verdicts
  - Create `packages/core/src/rules/prop5-determinism.prop.test.ts`
  - Tag: `// Feature: rule-engine, Property 5: Same input, same verdicts`
  - For any valid rule set and member list: `runRules` called twice returns identical results with exactly one verdict per member in member order; for any valid rules input, shuffling key order inside its objects gives the same verdicts; at least 100 runs
  - _Requirements: 3.3, 5.1, 5.3_

- [x] 13. Property test 6 — Validation is total
  - Create `packages/core/src/rules/prop6-parse-total.prop.test.ts`
  - Tag: `// Feature: rule-engine, Property 6: Validation is total`
  - For any JavaScript value (`fc.anything()`): `parseRules` returns without throwing, and when it fails it returns at least one error; for any generated valid rule set, parsing its JSON form succeeds and returns an equal rule set; for any valid rules input mutated so one condition names a signal outside the schema, `parseRules` fails with an error pointing at that rule; at least 100 runs
  - _Requirements: 1.1, 1.4, 1.7_

- [x] 14. Final checkpoint — Ensure all tests and typecheck pass
  - Run `npx vitest run` from the repo root and confirm all example tests and all six property tests pass
  - Run `tsc -p packages/core` and confirm it exits with no errors
  - Run `git status` and confirm the only changed paths are under `packages/core/`, `package-lock.json`, this spec's `tasks.md`, and `README.md`
  - Update the rule-engine line in `README.md` under "How Kiro was used": remove the text "Tasks not generated yet"
  - If any property test caught a real bug during the run, add one sentence under a "Property-based testing" subsection in `README.md` describing what it found
  - Ask the user if any questions arise before closing the spec

## Notes

- Tasks 8–13 are property tests driven by fast-check and are **required** (no `*` mark). `npx vitest run` must pass all six before the spec is considered done.
- Each property test file must carry a comment tag `// Feature: rule-engine, Property N: <name>` and run at least 100 cases.
- Arbitraries in `arbitraries.ts` (task 6) are shared infrastructure; later specs import them directly.
- Change nothing outside `packages/core/` except `package-lock.json` (npm install updates it; it must be committed) and the two README edits in task 14.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3", "4"] },
    { "id": 3, "tasks": ["5", "6"] },
    { "id": 4, "tasks": ["7"] },
    { "id": 5, "tasks": ["8"] },
    { "id": 6, "tasks": ["9"] },
    { "id": 7, "tasks": ["10"] },
    { "id": 8, "tasks": ["11"] },
    { "id": 9, "tasks": ["12"] },
    { "id": 10, "tasks": ["13"] },
    { "id": 11, "tasks": ["14"] }
  ]
}
```
