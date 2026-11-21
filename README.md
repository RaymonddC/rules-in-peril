# RIP: Rules In Peril

Find the smallest monster that walks past your rules, before the fraudsters do.

RIP is one engine that attacks a rule set with generated monsters, shrinks any monster that gets through to its smallest form, prices each fix in honest users blocked, and keeps caught monsters as regression tests. Two apps run on it:

- **Igor** attacks sign-up rules with fake identities stitched from borrowed and invented parts.
- **Salt Circle** attacks AI-agent guardrails with sequences of agent actions.

Kiroween 2026, category Skeleton Crew. The plan of record is the deck in [docs/](docs/).

All data is synthetic. Igor's people live in Vesper, a fictional country, and the signals are a generic model, not any vendor's data.

**Status:** steering and the first spec's requirements and design. No tasks, no code. Nothing runs yet.

## How Kiro was used

One line per spec, hook and agent, added in the same change as the thing itself.

- **Steering** · `.kiro/steering/` · five always-on files (product, tech, structure, synthetic-only, glossary) that hold every Kiro chat to the plan, to synthetic data and to one set of words.
- **Spec: rule-engine** (R3) · `.kiro/specs/rule-engine/` · requirements in EARS and a design with six correctness properties. Kiro writes the task list from them and runs it until the property tests pass. *Tasks not generated yet.*
- **Hook: lab report on rules save** · `.kiro/hooks/lab-report-on-rules-save.json` · when Kiro saves a rule pack in `rules/`, runs the CLI and rewrites `reports/latest.md`. *Off until the CLI exists.*
- **Hook: property tests after each task** · `.kiro/hooks/property-tests-after-task.json` · after every spec task, runs the property tests and tells the agent if one fails.

## License

MIT. See [LICENSE](LICENSE).
