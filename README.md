# RIP: Rules In Peril

Find the smallest monster that walks past your rules, before the fraudsters do.

RIP is one engine that attacks a rule set with generated monsters, shrinks any monster that gets through to its smallest form, prices each fix in honest users blocked, and keeps caught monsters as regression tests. Two apps run on it:

- **Igor** attacks sign-up rules with fake identities stitched from borrowed and invented parts.
- **Salt Circle** attacks AI-agent guardrails with sequences of agent actions.

Kiroween 2026, category Skeleton Crew. The plan of record is the deck in [docs/](docs/).

All data is synthetic. Igor's people live in Vesper, a fictional country, and the signals are a generic model, not any vendor's data.

**Status:** steering and the first spec's requirements and design. No tasks, no code. Nothing runs yet.

## How Kiro was used

The headings follow the write-up questions in the Kiroween rules. Each spec, hook and agent gets one line, added in the same change as the thing itself.

The steering files, the rule-engine requirements and design, and the two hooks were drafted outside Kiro and committed for Kiro to work from. Kiro writes the task lists and the code. From world-generator on, Kiro writes the specs too.

### Kiro IDE, CLI, Web, Crew

Nothing yet. Note here which ones the team used and how they differed.

### Custom agents

None yet. Doctor (invents monster patterns) and Inspector (proposes fixes) come after the core works.

### Agent hooks

- **Lab report on rules save** · `.kiro/hooks/lab-report-on-rules-save.json` · when Kiro saves a rule pack in `rules/`, runs the CLI and rewrites `reports/latest.md`. *Off until the CLI exists.*
- **Property tests after each task** · `.kiro/hooks/property-tests-after-task.json` · after every spec task, runs the property tests and tells the agent if one fails.

### Spec-driven development

- **rule-engine** (R3) · `.kiro/specs/rule-engine/` · requirements in EARS and a design with six correctness properties. Kiro writes the task list from them and runs it until the property tests pass. *Tasks not generated yet.*

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
