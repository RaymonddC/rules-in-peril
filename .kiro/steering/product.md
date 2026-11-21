---
inclusion: always
---

# Product: RIP (Rules In Peril)

Kiroween 2026 entry, category Skeleton Crew. The deck in `docs/` is the plan of record. If this file and the deck disagree, stop and ask.

Deadline: 4 Dec 2026 14:00 PT (5 Dec 05:00 WIB). Team of three.

## What it is

One engine, the skeleton, that does four things to a rule set:

1. Attacks it with generated monsters.
2. Shrinks any monster that walks to its smallest form.
3. Prices each fix in honest users blocked.
4. Keeps caught monsters in the crypt as regression tests.

Two apps run on that engine. Only the monsters change.

- **Igor.** The rules are sign-up rules in `rules.json`. A monster is a fake identity stitched from borrowed and invented parts.
- **Salt Circle.** The rules are AI-agent guardrails. A monster is a sequence of agent actions.

RIP is a pre-release lab. It is not a production fraud detector.

## Who it is for

| User | Gets |
|---|---|
| Fraud and risk analyst | The smallest monster, in one sentence |
| Engineer | A CLI, a Kiro hook and CI that fail when a caught monster walks again |
| Product owner | A price for every fix, before launch |
| Compliance and audit | Reports that re-run exactly from a seed |
| AI-agent team | The smallest action sequence that breaks the guardrails |

## Requirements

| ID | Requirement | Priority | Done when |
|---|---|---|---|
| R1 | Load a rule pack or `rules.json` in the browser | P0 | The file never leaves the browser |
| R2 | Generate a seeded world of honest users and monsters | P0 | Same seed gives the same report |
| R3 | Run every applicant through the rules, first match wins | P0 | Each verdict names the rule that fired |
| R4 | Shrink each monster that walks to its smallest form | P0 | One more cut gets it caught |
| R5 | Propose fixes and price each one | P0 | Rejected and review counts are shown |
| R6 | Save caught monsters to the crypt and re-run them | P0 | The CLI exits 1 if one walks again |
| R7 | Salt Circle world: agent actions against guardrails | P0 | The split-refund breach is found |
| R8 | Rules editor and Villagers screen | P1 | Rules change without editing JSON |
| R9 | Kiro MCP tools `run_lab` and `explain_monster` | P1 | Callable from Kiro chat |

## Scope rules

- P0 is R1 to R7. P1 is R8 and R9, and starts only after P0 runs end to end.
- Nothing else is in scope. Nothing from the deck's NEXT or LATER columns.
- If a P0 "done when" does not need it, do not build it.
- Every requirement has a test that proves its "done when".

## Product promises

- No monster walks after the chosen fix.
- At most 1% of honest users are wrongly rejected.
- No monster in the crypt walks again.
- Same seed and same rules give the same report.

## Igor world

Signals are the only things a rule can read.

| Signal | Values | Meaning |
|---|---|---|
| `registry` | `match`, `partial`, `mismatch`, `not_found` | Whether the name and birth date agree with the Vesper registry record for the ID number |
| `fileAgeMonths` | number | Age of the credit file. 0 means no file yet |
| `authorizedUserOnly` | boolean | The file exists only because someone added this identity to their account |
| `phoneAgeDays` | number | Days since the phone number was first seen |
| `emailAgeDays` | number | Days since the email address was first seen |
| `deviceIds24h` | number | Identities seen on this device in the last 24 hours |
| `addressIds30d` | number | Identities seen at this address in the last 30 days |
| `addressType` | includes `maildrop` | Kind of address |
| `ipType` | includes `datacenter` | Kind of network the sign-up came from |
| `docScore` | number | Score of the ID document check. Higher is better |
| `fillSeconds` | number | Seconds taken to fill the form |
| `age` | number | Age in years, from the stated birth date |

Full value lists and ranges are set in the world-generator spec.

Monster patterns:

- **Borrowed number.** An ID number that belongs to another Vesper resident (in the demo, a child) under a made-up name.
- **Manipulated twin.** A real Vesper identity with a few details changed.
- **Fully fabricated.** Every part invented.
- **Ring.** Several identities that share a device or an address.
- **Piggyback.** A thin identity whose only file comes from being added as an authorized user.
- **Aged then bust-out.** An identity left to age until its file, phone and email look old.

Starter fintech pack. Ordered, first match wins, default approve.

1. `docScore < 40` reject
2. `age < 18` reject
3. `deviceIds24h >= 3` reject
4. `ipType = datacenter` review
5. `addressType = maildrop` and `fileAgeMonths = 0` reject
6. `phoneAgeDays < 3` and `emailAgeDays < 3` review
7. `fillSeconds < 20` reject

No rule in the pack reads `registry`. That is the gap the demo finds.

**Demo acceptance.** With seed 1818 and the starter pack, a borrowed-number monster walks and shrinks to two stitches (a child's ID number, a made-up name), and the autopsy shows that no rule reads `registry`.

## Salt Circle world

Agent actions are checked against guardrails, one action at a time.

**Demo acceptance.** The split-refund breach is found: four $499 refunds pass where one $2,000 refund is blocked, because no rule adds them up.

## Screens

- Igor, P0: Start, Lab, Autopsy, Close the gap, Crypt.
- Igor, P1: Villagers, Rules editor.
- Salt Circle, P0: The circle, Breach replay.
- Screen text is in English and in plain words: stitched, walked, villagers.
- Say "the smallest found by the search". Never claim a proven minimum.

Other numbers on the deck (41 walk, monster #17, 3.1% to review) are samples, not acceptance criteria.

## Non-goals

- No real personal data or any country's ID format.
- No ML model or LLM while the app runs.
- No backend, accounts or server storage.
- No real KYC vendor integrations.
- No production fraud detection.
