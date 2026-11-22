# Kiro prompts

The prompt that starts each spec in Kiro, in the order the specs run. Paste a block as it is.

Unless a prompt says otherwise, start a new feature spec in Kiro, requirements first, with the name in the heading.

## Order

| # | Spec | Lane | Start when |
|---|---|---|---|
| 1 | rule-engine | Core | Now |
| 2 | world-generator | Core | rule-engine's tests pass |
| 3 | shrink-and-autopsy | Core | world-generator's World interface is merged |
| 3 | igor-world | Igor | world-generator's World interface is merged |
| 3 | salt-circle | Salt Circle | world-generator's World interface is merged |

The three specs numbered 3 run in parallel, one person each. The prompts for fix-pricing, crypt-and-cli and igor-app are added here once the World interface exists, because they depend on it.

After each spec: add its line to "How Kiro was used" in the README, in the same change.

## What already exists

The npm workspace root, `tsconfig.base.json` and the screens of both apps are in the repo. The screens run on hand-written sample data: each app has `src/lab/sample-run.ts`, which fills the view types in `src/lab/types.ts`.

No spec rebuilds or restyles a screen. The specs build the engine and the two worlds. The last step for each app is an adapter that fills the view types from the engine's output and replaces `sample-run.ts`. The numbers on screen will then differ from the sample, and that is expected.

`TODO(engine)` and `TODO(igor-world)` comments in `apps/` mark the places that wait for a spec.

## 1. rule-engine

The requirements and design are already in `.kiro/specs/rule-engine/`. This prompt asks Kiro for the task list only. Use it in the chat for that spec.

```
#spec:rule-engine The requirements and design for this spec are written and reviewed. Do not rewrite them. Generate tasks.md from them. Keep it short: add packages/core to the workspace, types, parseRules, evaluate and runRules, signalsRead, then the tests. The npm workspace root already exists: add to it, do not recreate it, and do not touch apps/. The tsconfig for packages/core must not include the DOM library. Make all six property tests required tasks, not optional. Stop after writing tasks.md so I can review it.
```

Then run all tasks. The spec is done when `npx vitest run` passes with the six property tests.

If Kiro does not show the spec, start a new feature spec named `rule-engine`, requirements first, and give it the same prompt, pointing at the two files.

## 2. world-generator

```
Create the spec world-generator. It serves R2 in product.md and lives in packages/core.

Scope: the World interface, seeded generation of a world, running every member through a rule set, and the report. Use the rule-engine types as they are. No Igor or Salt Circle content: the igor-world and salt-circle specs build on this one.

What the World interface must allow, without core knowing either app:
1. A member presents one or more signal records. In Igor a member is one applicant with one record. In Salt Circle a member is a task made of several actions, each checked on its own with its own record.
2. The truth label (villager or monster) sits outside the signal records, and a world's signal schema can never contain it.
3. A monster is made of stitches. The world can rebuild a monster's signal records from any subset of its stitches. The shrink spec depends on this.
4. A monster walks when every one of its records is approved and the world says the attack still does its harm. Only monsters walk.

Requirements to cover:
- Same seed gives the same world. Same seed and same rules give the same report, byte for byte, with no timestamps or paths.
- Every generated signal record fits the world's signal schema.
- A monster's records equal what the world rebuilds from its full list of stitches.
- The report gives counts of villagers and monsters by outcome, which monsters walk, and how many members each rule caught. Core returns it as data and as Markdown text. Core writes no files.

Tests use a small test world inside core, in neutral words, with both single-record and multi-record members.

Order the tasks so the World interface and its types come first and can be merged on their own: two other people build against it. Make every property test a required task, not optional. Check the fast-check docs for seeded sampling before choosing how the seed drives generation.

Out of scope: shrinking, autopsy, fix pricing, the crypt, the CLI, screens, rule packs.

Stop after requirements, after design and after tasks for my review. Ask one question at a time.
```

Read the World interface in Kiro's design with the Igor and Salt Circle owners before going on. It is the gate for the three parallel specs.

## 3. shrink-and-autopsy

```
Create the spec shrink-and-autopsy. It serves R4 in product.md and lives in packages/core. Use the World interface and the rule engine as merged.

Scope: shrink a monster that walks to the smallest form the search finds, and produce its autopsy.

Requirements to cover:
- Shrinking only removes stitches. It never adds one and never changes one.
- After every step the monster still walks, by the World's own rule: every record approved and the harm still done.
- The result is locally smallest: removing any one remaining stitch gives something that no longer walks. Test this directly. Check the fast-check docs before relying on its shrinker for this guarantee.
- Same monster and same rules give the same shrunk monster.
- The autopsy lists the remaining stitches with what the world says about each, the rules that were tested, and the blind spot: the signals the remaining stitches change that no rule reads (use signalsRead). The world, not core, says which signals a stitch changes.
- Call the result "the smallest found by the search". Nothing in the data or text claims a proven minimum.

Test on the core test world, with single-record and multi-record members. Make every property test a required task.

Out of scope: fixes and pricing, the crypt, the CLI, screens, any Igor or Salt Circle content.

Stop after requirements, design and tasks for my review. Ask one question at a time.
```

## 3. igor-world

```
Create the spec igor-world. It serves R2 in product.md and lives in apps/igor/world. It implements the World interface from packages/core. Pure TypeScript: no React, no DOM, no Node built-ins.

Scope: Igor's signal schema (the twelve signals in product.md, with full value lists and ranges), the villagers of Vesper, the six monster patterns built from stitches, and the starter fintech pack as rules/starter-fintech.json, exactly as listed in product.md.

Requirements to cover:
- Each stitch is one borrowed or invented part, labelled as such, and names the signals it changes.
- Removing a stitch changes the signals in a defined way. For example, with no ID number there is no document to score.
- Enough villagers show registry "partial" (a typo, a changed name) that rejecting on registry would break the 1% promise, while sending them to review would not.
- With seed 1818, 1,000 applicants and the starter pack: at least one borrowed-number monster walks, and the pack rejects at most 1% of villagers.
- Every record fits the schema. Same seed gives the same world. The truth label is never a signal.
- synthetic-only.md applies to every name, address and number.

Last task, to run once shrink-and-autopsy is merged: the seed 1818 monster shrinks to two stitches (a child's ID number, a made-up name), each cut stops it walking, and the autopsy names registry.

apps/igor/src/lab/example-rules.ts holds a hand-written copy of the starter pack for the screens. Once rules/starter-fintech.json exists it is the one source: resolve the TODO(igor-world) in that file and change nothing else under apps/igor/src.

Make every property test a required task. Out of scope: screens, shrinking itself, pricing, the crypt, the CLI.

Stop after requirements, design and tasks for my review. Ask one question at a time.
```

## 3. salt-circle

```
Create the spec salt-circle. It serves R7 in product.md and lives in apps/salt-circle. Build the world in world/. The two screens (The circle, Breach replay) already exist in src/ and run on sample data: do not rebuild or restyle them.

World: a member is an agent task made of several actions. Each action is one record, checked on its own. Signals include the action's own fields (such as type and amount) and a running total for the task. A monster's stitches are its actions, and removing one rebuilds the running totals. Use the same rule format and the same three outcomes as the rule engine; screen words may differ (allowed, ask a human, blocked).

Guardrail pack: rules/salt-circle-guardrails.json. It blocks a single large refund and does not read the running total. That is the gap.

Requirements to cover:
- One $2,000 refund is blocked. A task of four $499 refunds walks.
- Set the single-refund limit and the harm line so that four is the smallest: three $499 refunds ($1,497) must not count as harm.
- Some legitimate tasks make more than one small refund, so a fix that reads the running total has a price.
- Same seed gives the same world. Every record fits the schema. The truth label is never a signal.
- synthetic-only.md applies: invented customers and orders, no real company or agent product names.

Last task, once shrink-and-autopsy is merged: replace src/lab/sample-run.ts with an adapter that fills the view types in src/lab/types.ts from the engine's output, and delete the sample. Change a view type only where the engine cannot fill it. No network requests. Acceptance: on screen, the breach shrinks to four $499 refunds and the autopsy names the running total.

Make every property test a required task. Out of scope: Igor, pricing, the crypt, the CLI.

Stop after requirements, design and tasks for my review. Ask one question at a time.
```
