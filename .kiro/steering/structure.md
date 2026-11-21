---
inclusion: always
---

# Structure

One template, two distinct apps, each in its own folder. Do not add top-level folders.

```
.kiro/               Kiro steering, specs, hooks and agents. Committed. Never in .gitignore.
docs/                The deck: plan of record.
packages/core/       The skeleton. Rule engine, world interface, shrinking, autopsy, fix pricing, crypt format.
packages/cli/        The rip CLI. Runs a world against a rules file, writes the report, re-runs the crypt.
apps/igor/           Igor. world/ holds identities, signals and monster patterns. src/ holds the React screens.
apps/salt-circle/    Salt Circle. world/ holds agent actions and guardrail signals. src/ holds the React screens.
rules/               Rule packs, JSON.
crypt/               Caught monsters, JSON, one file per monster.
reports/             latest.md, written by the CLI.
```

## Who may import what

- `packages/core` imports nothing from `packages/cli` or `apps/*`.
- `apps/*/world` imports `packages/core` only. No React, no DOM, no Node built-ins, so the CLI can load it too.
- `apps/*/src` imports its own `world` and `packages/core`.
- `packages/cli` imports `packages/core` and the two `world` folders.
- The two apps never import each other.

## The skeleton rule

`packages/core` knows nothing about identities, sign-ups, agents or refunds. A world plugs in through one interface that core defines. If a word from Igor or Salt Circle shows up in core, the code is in the wrong folder.

Code that both apps need goes in core. Code that one app needs stays in that app.

## Naming

- Workspace packages: `@rip/core`, `@rip/cli`, `@rip/igor`, `@rip/salt-circle`.
- Files: `kebab-case.ts`. React components: `PascalCase.tsx`.
- Tests sit next to the code: `thing.test.ts` for examples, `thing.prop.test.ts` for properties.
- Use the words in `glossary.md` for types, functions and screen text.

## Specs

- One folder per spec: `.kiro/specs/<spec-name>/` with `requirements.md`, `design.md` and `tasks.md`.
- Requirements are written in EARS, and each one names the R-number it serves (R1 to R9 in `product.md`).
- The design lists the properties from `tech.md` that the spec carries.
- A spec is done when the tests that prove its "done when" pass.
- Keep specs small.

## README

`README.md` keeps a section "How Kiro was used": one line per spec, hook and agent, added in the same change as the thing itself.

## Working rules

- Work in order. Stop after each step for review.
- Ask one question at a time.
- Committed files never contain machine paths, hostnames or personal contact details.
