# RIP: Rules In Peril

Find the smallest monster that walks past your rules, before the fraudsters do.

RIP is one engine that attacks a rule set with generated monsters, shrinks any monster that gets through to its smallest form, prices each fix in honest users blocked, and keeps caught monsters as regression tests. Two apps run on it:

- **Igor** attacks sign-up rules with fake identities stitched from borrowed and invented parts.
- **Salt Circle** attacks AI-agent guardrails with sequences of agent actions.

Kiroween 2026, category Skeleton Crew. The plan of record is the deck in [docs/](docs/).

All data is synthetic. Igor's people live in Vesper, a fictional country, and the signals are a generic model, not any vendor's data.

**Status:** the engine (`packages/core`), both worlds and the CLI report run, with 107 passing tests. With seed 1818 and the starter pack, 46 of 120 monsters walk, every walker shrinks to 2 stitches, and 0.6% of villagers are rejected. Still to come: the crypt format and the CLI's exit 1 when a crypt monster walks, and a check that every screen shows engine output instead of the sample.

**Technical depth:** [docs/technical-depth.md](docs/technical-depth.md) covers the method (property-based testing and delta debugging), how each app maps to NIST SP 800-63A-4 and the OWASP Top 10 for LLM Applications, measured fix prices, and the limits.

## How it is built

```
packages/core     the skeleton: rule engine, World interface, seeded runs, shrink, fix pricing
packages/cli      rip CLI: runs a world against a rules file, writes reports/latest.md
apps/igor         world/ (identities in Vesper) and src/ (React screens)
apps/salt-circle  world/ (agent tasks)          and src/ (React screens)
rules/            rule packs, JSON
```

Core knows no word from either app. A world plugs in through one interface, and the screens and the CLI call the same core.

## Build your own world

A third app on the skeleton is one folder that implements `World<S>` from `packages/core/src/world/types.ts`. `S` is your stitch type: one part of a monster.

| Member | What you provide |
|---|---|
| `schema` | The signals your rules may read, each a number, a boolean or a list of values. Never the truth label. |
| `members` | Villagers and monsters from one seed. Use `makePrng(seed)` from core; never `Math.random()`. |
| `records(stitches)` | The signal records for any subset of a monster's stitches. Decide what each signal becomes when its stitch is missing; shrinking depends on it. |
| `harmDone(records)` | Whether the attack still does its harm. A monster walks only when every record is approved and this is true. |
| `stitchLabel(stitch)` | Plain words for the autopsy, such as "a child's ID number". |
| `signalsChanged(stitch)` | The signals a stitch sets. Core uses it to name the blind spot. |

Then call core:

```ts
import { parseRules, runWorld, shrink, priceFixes, formatReport } from "@rip/core";

const parsed = parseRules(rulesJson, world.schema);   // errors, never a partial rule set
if (!parsed.ok) throw new Error(parsed.errors.map((e) => e.message).join("\n"));
const report = runWorld(world, parsed.ruleSet, seed);  // verdicts, walkers, rule hits
const smallest = shrink(world, monster, parsed.ruleSet); // stitches left, blind spot
const prices = priceFixes(world, report, parsed.ruleSet, fixes, seed);
console.log(formatReport(report));                     // same seed, same Markdown
```

Igor (one record per applicant) and Salt Circle (one record per agent action, with a running total) show the two shapes a member can take. A promo-abuse or seller-onboarding world would follow the same pattern.

## Run it

Needs Node 22 or newer.

```bash
npm install
npm run dev:igor          # Igor, with reload
npm run dev:salt-circle   # Salt Circle, with reload
npx vitest run            # every example and property test, once
npm run report            # Igor world vs rules/starter-fintech.json, writes reports/latest.md
```

The whole site as it is hosted, with the front door at `/` and the apps at `/igor/` and `/salt-circle/`:

```bash
npm run build:site
npm run preview:site      # http://localhost:4173
```

### Host it on Cloud Run

The `Dockerfile` builds the site and serves the files with Caddy. The container runs no application code: the apps run in the visitor's browser. With the gcloud CLI signed in, from the repo root:

```bash
gcloud run deploy rules-in-peril --source . --project <project-id> --region <region> --allow-unauthenticated --max-instances 2
```

The project needs billing switched on. gcloud asks to enable the APIs it needs the first time, and prints the site's address when it finishes. Run the same command again to publish a new version.

### Publish on every push to main

`.github/workflows/deploy.yml` builds the image and deploys it each time `main` changes. It signs in to Google Cloud with a short-lived identity token from GitHub, so no key is stored anywhere. It reads four settings from the repository's Actions secrets. They are identifiers, not credentials, and are kept there so they stay out of the files and the public logs:

- `GCP_PROJECT_ID` and `GCP_REGION`: where the service runs.
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: the Google Cloud identity provider that trusts this repository.
- `GCP_DEPLOY_SA`: the service account the workflow deploys as.

If any of the four is missing, the workflow publishes nothing and still passes.

## How Kiro was used

The headings follow the write-up questions in the Kiroween rules. Each spec, hook and agent gets one line, added in the same change as the thing itself.

The steering files, the rule-engine requirements and design, and the two hooks were drafted outside Kiro and committed for Kiro to work from. The screens in `apps/`, the front door and the hosting files were also built outside Kiro. The engine (`packages/core`), the two worlds, the CLI and the screen adapters were written by Kiro: the rule engine from the rule-engine spec's task list, the rest from agent chat. Joining the two was done outside Kiro: one call in `packages/core/src/world/generate.ts` and the dependency versions.

### Kiro IDE, CLI, Web, Crew

- **Kiro IDE** · spec tasks wrote the rule engine. Agent chat wrote the rest of the engine, the worlds, the CLI and the adapters, and ran the tests and builds from the IDE terminal.

### Custom agents

None yet. Doctor (invents monster patterns) and Inspector (proposes fixes) are planned.

- **Built-in sub-agent** · Kiro delegated one multi-module job to its general task sub-agent in a fresh context: shrink, fix pricing, the Igor and Salt Circle worlds, the CLI and the two adapters.

### Agent hooks

- **Lab report on rules save** · `.kiro/hooks/lab-report-on-rules-save.json` · when Kiro saves a rule pack in `rules/`, runs the CLI and rewrites `reports/latest.md`. *Still off: it waits for the crypt and the CLI's exit code.*
- **Property tests after each task** · `.kiro/hooks/property-tests-after-task.json` · after every spec task, runs the property tests and tells the agent if one fails. *Switched on while the rule-engine spec ran its 20 tasks. Code built from chat never triggers it.*

### Spec-driven development

- **rule-engine** (R3) · `.kiro/specs/rule-engine/` · requirements in EARS and a design with six correctness properties. Kiro wrote the task list and ran all 20 tasks: 14 that built `packages/core/src/rules` and 6 that fixed what a code review found. Its 31 example tests and 14 property tests pass. A second rule engine, written in chat to the same design while the spec ran, was replaced by this one: the worlds, shrink and pricing built on the chat version needed one changed call.

The prompt that starts each spec in Kiro is kept in [docs/kiro-prompts.md](docs/kiro-prompts.md), with the order the specs run in.

What the spec changed: the six properties existed before any code, so the tests asked for "first match wins for any rule set" instead of a few hand-picked cases. The later worlds had no spec, and their first version passed its own tests while every monster walked (see property-based testing).

### Steering docs

- **Five always-on files** · `.kiro/steering/` · product, tech, structure, synthetic-only and glossary hold every Kiro chat to the plan, to synthetic data and to one set of words.
- What they changed in practice: generated worlds use Vesper and the `VSP-` ID form, never a real ID format (synthetic-only). Core has no clock, no `Math.random()` and no app words (tech, structure). The Igor demo was checked against the acceptance line in `product.md`, which is how the first world's failure was spotted.

### MCP

None yet. P1: the tools `run_lab` and `explain_monster`, callable from Kiro chat.

### Property-based testing

- **Rule-engine properties, test design** · fast-check generated signal names from regular expressions, which was slow enough that 15 property tests timed out. Fix: generators draw from fixed name pools. The suite went from over six minutes to about one second, with the same properties.
- **Inherited names, caught by review, not by a property** · a rule could read `constructor` or `toString` as a signal and still get a verdict, because lookups followed the prototype chain. No property saw it: generated signal names never spell those words. Fix: own-property lookups, and the unknown-signal property now draws those names.
- **Igor world, caught by acceptance, not by a property** · the first world's tests passed, but the CLI report showed 120 of 120 monsters walking, and shrinking could cut a monster down to nothing because a missing stitch fell back to a clean value. Fix: defined values for missing stitches, harm only while the registry does not match, and careless monsters. A new test checks the demo line in `product.md`: monster #17 shrinks to two stitches, each cut gets it caught, and the blind spot is `registry`.

### Kiro powers

None used.

## License

MIT. See [LICENSE](LICENSE).
