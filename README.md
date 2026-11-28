# RIP: Rules In Peril

Find the smallest monster that walks past your rules, before the fraudsters do.

RIP is one engine that attacks a rule set with generated monsters, shrinks any monster that gets through to its smallest form, prices each fix in honest users blocked, and keeps caught monsters as regression tests. Two apps run on it:

- **Igor** attacks sign-up rules with fake identities stitched from borrowed and invented parts.
- **Salt Circle** attacks AI-agent guardrails with sequences of agent actions.

Kiroween 2026, category Skeleton Crew. The plan of record is the deck in [docs/](docs/).

All data is synthetic. Igor's people live in Vesper, a fictional country, and the signals are a generic model, not any vendor's data.

**Status:** the screens for both apps run on hand-written sample data (seed 1818). The engine is not built yet: no spec has been run in Kiro, so no number on screen is a real result.

## Run it

Needs Node 22 or newer.

```bash
npm install
npm run dev:igor          # Igor, with reload
npm run dev:salt-circle   # Salt Circle, with reload
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

The steering files, the rule-engine requirements and design, and the two hooks were drafted outside Kiro and committed for Kiro to work from. The screens in `apps/`, the front door and the hosting files were also built outside Kiro. Kiro writes the task lists and the engine: `packages/core`, the two worlds and the CLI. From world-generator on, Kiro writes the specs too.

### Kiro IDE, CLI, Web, Crew

Nothing yet. Note here which ones the team used and how they differed.

### Custom agents

None yet. Doctor (invents monster patterns) and Inspector (proposes fixes) come after the core works.

### Agent hooks

- **Lab report on rules save** · `.kiro/hooks/lab-report-on-rules-save.json` · when Kiro saves a rule pack in `rules/`, runs the CLI and rewrites `reports/latest.md`. *Off until the CLI exists.*
- **Property tests after each task** · `.kiro/hooks/property-tests-after-task.json` · after every spec task, runs the property tests and tells the agent if one fails.

### Spec-driven development

- **rule-engine** (R3) · `.kiro/specs/rule-engine/` · requirements in EARS and a design with six correctness properties. Kiro wrote the task list (20 tasks) and ran all of them: `packages/core` is built, all 31 example tests and all 14 property tests pass, and typecheck is clean.

The prompt that starts each spec in Kiro is kept in [docs/kiro-prompts.md](docs/kiro-prompts.md), with the order the specs run in.

When a spec changes how something gets built, compared with asking for the code directly, add a line here.

### Steering docs

- **Five always-on files** · `.kiro/steering/` · product, tech, structure, synthetic-only and glossary hold every Kiro chat to the plan, to synthetic data and to one set of words.

### MCP

None yet. P1: the tools `run_lab` and `explain_monster`, callable from Kiro chat.

### Property-based testing

Nothing yet. Each time a property test catches a real bug, add one line: the property, what it caught, the fix.

### Kiro powers

None used.

## License

MIT. See [LICENSE](LICENSE).
