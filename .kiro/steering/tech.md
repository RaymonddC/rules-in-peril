---
inclusion: always
---

# Tech

## Stack

- TypeScript in strict mode, ES modules.
- Vite and React for the two apps.
- fast-check for generation, shrinking and property tests.
- Zod for every file that crosses a boundary: rules, crypt entries.
- Vitest for tests.
- npm workspaces. Node 22 or newer.
- GitHub Actions for CI.
- The site is hosted on Cloud Run. The `Dockerfile` at the root builds the static site (`npm run build:site`) and serves the files with Caddy.

Do not add a dependency unless a spec task needs it. Ask first.

## Hard constraints

- Static site and CLI only. No server, no backend, no accounts, no database. The hosting container only hands out the built files and runs no application code. Do not add routes, handlers or server-side logic to it.
- No LLM or ML model at run time. Kiro agents work at build time, and what they produce is committed as plain code or JSON.
- No API keys, tokens, secrets or `.env` files. There is nothing to configure.
- The apps make no network request after the page loads: no fetch, no analytics, no remote fonts or scripts. A rules file the user loads is read in the browser and never leaves it (R1).
- `/.kiro` is committed and never listed in `.gitignore`.

## Determinism

- All randomness comes from the seed. No `Math.random()`, no `Date.now()`, and nothing that depends on locale or time zone, in `packages/core` or in any world.
- Same seed and same rules give the same report, byte for byte. Reports carry no timestamps and no absolute paths.

## Rule engine contract

- Rules are an ordered list. The first rule whose `when` matches gives the verdict. If none matches, the verdict is the default, `approve`.
- Every verdict names the rule that fired, or says it was the default.
- A rule is `{ id, when, then }`. `when` is one condition `{ signal, op, value }` or `{ all: [ ...conditions ] }`. `then` is `reject`, `review` or `approve`.

```json
{
  "id": "maildrop-new-file",
  "when": { "all": [
    { "signal": "addressType", "op": "=", "value": "maildrop" },
    { "signal": "fileAgeMonths", "op": "=", "value": 0 }
  ] },
  "then": "reject"
}
```

- The full list of operators is set in the rule-engine spec.
- A rule reads signals only. The truth label (villager or monster) is never a signal: it lives outside the object the engine receives, and validation rejects a rule that names anything that is not a signal of the loaded world.
- An invalid rules file stops the run with a clear message. No partial runs.

## Where code may run

- `packages/core` is pure TypeScript: no DOM, no React, no Node built-ins. It runs unchanged in the browser and in the CLI.
- Reading and writing files happens only in `packages/cli`.
- Rendering happens only in `apps/*/src`.

## Testing

- Each requirement has a test that proves its "done when".
- Property tests use fast-check and live in `*.prop.test.ts`. Example tests live in `*.test.ts`. Both sit next to the code they test.
- Run tests once, never in watch mode: `npx vitest run`.
- `npm run report` runs the rip CLI over every rule pack in `rules/`, re-runs the crypt and writes `reports/latest.md`. It exits 1 if a crypt monster walks. The rules-save hook and CI both call it. The crypt-and-cli spec adds it.
- A failing property is fixed in the code or in the spec. Never weaken the property, and never pin a seed to dodge it.

## Properties every spec carries

Each spec's design picks up the ones it touches and turns them into property tests.

- **Deterministic.** Same seed and same rules give the same report.
- **First match.** A verdict comes from the first matching rule; with no match, the default.
- **Shrink keeps walking.** A shrunk monster still walks.
- **Shrink never adds.** Shrinking never adds parts.
- **Reject on top is safe.** Adding a reject rule at the top never turns a reject into an approve.
- **Label blind.** Rules can never read whether an applicant is honest or a monster.
- **Product promises.** No monster walks after the chosen fix. At most 1% of honest users are wrongly rejected. No monster in the crypt walks again.
