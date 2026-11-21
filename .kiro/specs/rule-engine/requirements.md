# Requirements Document

## Introduction

The rule engine is the first piece of the RIP skeleton in `packages/core`. It checks a rules file, then gives every member of a world a verdict: the first rule that matches wins, and with no match the verdict is the default, approve. Every verdict names the rule that fired.

This spec covers R3 from `product.md` and nothing else. It is kept small on purpose: it is the first spec the team runs through Kiro.

In scope: validating a rules input against a world's signals, deciding verdicts, listing the signals a rule set reads.

Out of scope: generating a world, shrinking, pricing fixes, the crypt, the CLI, any screen, reading files from disk, and any Igor or Salt Circle signal list. The engine learns which signals exist from the world that calls it.

## Glossary

- **Rule_Engine**: The part of `packages/core` that validates a rules input and gives verdicts.
- **Signal**: A named fact about a member that a rule can read. It is a number, a boolean, or one value from a fixed list.
- **Signal_Schema**: The signals a world offers, with the type of each. The world supplies it. The Rule_Engine never defines one.
- **Member**: One villager or monster in a world. In Igor, an applicant. The Rule_Engine sees only a member's id and signals.
- **Truth_Label**: Whether a member is a villager or a monster. It is never a signal.
- **Rules_Input**: The raw content of a rules file, before validation.
- **Condition**: `{ signal, op, value }`.
- **Rule**: `{ id, when, then }`.
- **Rule_Set**: A validated, ordered list of rules.
- **Outcome**: `reject`, `review` or `approve`.
- **Verdict**: An outcome, plus the id of the rule that fired or a mark that it was the default.

## Requirements

### Requirement 1: Validate a rules input

**User Story:** As a risk analyst, I want my rules file checked before anything runs, so that a mistake in the file never produces a misleading report.

**Serves:** R3

#### Acceptance Criteria

1. WHEN the Rule_Engine receives a Rules_Input and a Signal_Schema, THE Rule_Engine SHALL return either a Rule_Set or a list of errors, and SHALL NOT throw for any input value.
2. THE Rule_Engine SHALL accept a Rules_Input only if it is an object with a `rules` list in which each Rule has exactly the keys `id`, `when` and `then`, and `then` is `reject`, `review` or `approve`.
3. THE Rule_Engine SHALL accept a `when` only if it is one Condition `{ signal, op, value }` or `{ all: [...] }` holding one or more Conditions, and each `op` is one of `=`, `!=`, `<`, `<=`, `>`, `>=`.
4. IF a Condition names a signal that is not in the Signal_Schema, THEN THE Rule_Engine SHALL reject the Rules_Input.
5. IF a Condition's value does not fit the type of its signal, or a Condition uses `<`, `<=`, `>` or `>=` on a signal that is not a number, THEN THE Rule_Engine SHALL reject the Rules_Input.
6. IF a Rule's id is empty, or two Rules share an id, THEN THE Rule_Engine SHALL reject the Rules_Input.
7. WHEN the Rule_Engine rejects a Rules_Input, THE Rule_Engine SHALL report every error it found, each with the position of the Rule and a message in plain words.
8. THE Rule_Engine SHALL accept a Rules_Input whose `rules` list is empty.

### Requirement 2: First match wins

**User Story:** As a risk analyst, I want each member judged by the first rule that matches, so that the order of my rules means what I think it means.

**Serves:** R3

#### Acceptance Criteria

1. WHEN a Member is evaluated, THE Rule_Engine SHALL test the Rules in the order they appear in the Rule_Set and give the Outcome of the first Rule whose `when` matches.
2. IF no Rule matches, THEN THE Rule_Engine SHALL give the Outcome `approve`.
3. THE Rule_Engine SHALL treat `{ all: [...] }` as a match only when every Condition in it matches.
4. THE Rule_Engine SHALL compare with `=` and `!=` by exact equality, and with `<`, `<=`, `>` and `>=` by numeric order.
5. IF a Condition being tested reads a signal that the Member does not have, THEN THE Rule_Engine SHALL stop with an error that names the Member and the signal, and SHALL NOT return a Verdict for any Member in that run.
6. WHEN a Rule is added at the top of a Rule_Set, THE Rule_Engine SHALL give every Member that the new Rule does not match the same Verdict as before.
7. WHEN a reject Rule is added at the top of a Rule_Set, THE Rule_Engine SHALL still reject every Member that the Rule_Set rejected before.

### Requirement 3: Every verdict names its rule

**User Story:** As a compliance reviewer, I want every verdict to say which rule produced it, so that any decision can be traced.

**Serves:** R3

#### Acceptance Criteria

1. WHEN a Rule gives the Outcome, THE Verdict SHALL carry the id of that Rule.
2. WHEN no Rule matches, THE Verdict SHALL say that it came from the default and SHALL carry no rule id.
3. WHEN the Rule_Engine runs a Rule_Set over a list of Members, THE Rule_Engine SHALL return exactly one Verdict for each Member, in the order of the Members, each with the Member's id.

### Requirement 4: Rules read signals only

**User Story:** As a product owner, I want proof that the rules cannot see who is honest, so that the lab's results mean something.

**Serves:** R3, and the autopsy in R4

#### Acceptance Criteria

1. THE Rule_Engine SHALL decide a Verdict from the Rule_Set and the Member's signals, and from nothing else.
2. THE Rule_Engine SHALL give the same Verdict to two Members whose signals are equal, whatever their Truth_Labels are.
3. THE Rule_Engine SHALL list the signals that a Rule_Set reads, each one once.
4. WHEN the value of a signal that the Rule_Set does not read changes, THE Verdict SHALL stay the same.

### Requirement 5: Same input, same verdicts

**User Story:** As an auditor, I want the same rules and the same members to give the same verdicts every time, so that a report can be reproduced.

**Serves:** R3, and the report in R2

#### Acceptance Criteria

1. THE Rule_Engine SHALL return the same Verdicts every time it is given the same Rule_Set and the same Members.
2. THE Rule_Engine SHALL NOT read the clock, random numbers, the locale or anything else outside its inputs.
3. THE Rule_Engine SHALL give the same Verdicts for two Rules_Inputs that differ only in the order of the keys inside their objects.
