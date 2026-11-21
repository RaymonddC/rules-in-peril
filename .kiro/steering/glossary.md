---
inclusion: always
---

# Glossary

Use these words, with these meanings, in code, specs, tests and screen text.

| Word | Meaning | In Igor | In Salt Circle |
|---|---|---|---|
| world | A seeded population built for one app: villagers and monsters, each with the signals the rules can read. Same seed, same world. | 1,000 sign-up applicants in Vesper | Agent tasks, each a sequence of actions |
| villager | An honest member of the world. Villagers are how a fix is priced. | An honest applicant | A legitimate agent task |
| monster | A generated attacker. | A fake identity stitched from borrowed and invented parts | A sequence of agent actions that together do what the guardrails are meant to stop |
| stitch | One part of a monster, and the unit that shrinking removes. | One borrowed or invented part of an identity, such as a child's ID number or a made-up name | One action in the sequence |
| walk | A monster walks when the rules let it through. Only monsters walk. | The verdict is approve. Reject and review both count as caught. | Every action is allowed and the sequence still does the harm |
| crypt | The `crypt/` folder: caught monsters kept as regression tests. Every run checks them again, and the CLI exits 1 if one walks. | Same | Same |

## Related words

- **caught**: a monster that does not walk.
- **shrink**: remove stitches from a monster that walks, while it still walks. Shrinking never adds a stitch.
- **smallest**: the smallest found by the search. Not a proof.
- **autopsy**: the account of a shrunk monster: its stitches, which are borrowed and which invented, and the blind spot.
- **blind spot**: a signal that would give the monster away and that no rule reads.
- **fix**: a proposed rule change that catches the monster.
- **price**: what a fix costs in villagers: how many are rejected and how many go to review.
- **rule pack**: a ready-made rules file in `rules/`.
- **truth label**: whether a member of the world is a villager or a monster. Rules can never read it.
