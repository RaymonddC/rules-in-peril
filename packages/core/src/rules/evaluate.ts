// Rule evaluation: matches, evaluate, runRules, signalsRead.
// Pure functions. No DOM, no Node, no clock, no randomness.

import type { Condition, Rule, RuleSet, Signals, Verdict, When } from "./types";
import { DEFAULT_OUTCOME } from "./types";

/** Test a single condition against a signals record. */
function testCondition(cond: Condition, signals: Signals, memberId: string): boolean {
  if (!(cond.signal in signals)) {
    throw new Error(`Member "${memberId}" is missing signal "${cond.signal}".`);
  }
  const val = signals[cond.signal]!;
  const ref = cond.value;

  switch (cond.op) {
    case "=":
      return val === ref;
    case "!=":
      return val !== ref;
    case "<":
      return (val as number) < (ref as number);
    case "<=":
      return (val as number) <= (ref as number);
    case ">":
      return (val as number) > (ref as number);
    case ">=":
      return (val as number) >= (ref as number);
  }
}

/** Test a When clause (single condition or { all }) against signals. */
export function matches(when: When, signals: Signals, memberId: string = ""): boolean {
  if ("all" in when) {
    return when.all.every((cond) => testCondition(cond, signals, memberId));
  }
  return testCondition(when, signals, memberId);
}

/** Evaluate a rule set against one member's signals. First match wins; default is approve. */
export function evaluate(ruleSet: RuleSet, signals: Signals, memberId: string = ""): Verdict {
  for (const rule of ruleSet.rules) {
    if (matches(rule.when, signals, memberId)) {
      return { outcome: rule.then, ruleId: rule.id };
    }
  }
  return { outcome: DEFAULT_OUTCOME, ruleId: null };
}

/** Run a rule set over a list of members. Returns one verdict per member, in order.
 *  If a member is missing a signal, throws with the member id and signal name in the message.
 */
export function runRules(
  ruleSet: RuleSet,
  members: readonly { id: string; signals: Signals }[],
): { memberId: string; verdict: Verdict }[] {
  return members.map((m) => ({
    memberId: m.id,
    verdict: evaluate(ruleSet, m.signals, m.id),
  }));
}

/** List the signal names read by a rule set. Sorted, no duplicates. */
export function signalsRead(ruleSet: RuleSet): string[] {
  const names = new Set<string>();
  for (const rule of ruleSet.rules) {
    collectSignals(rule.when, names);
  }
  return [...names].sort();
}

function collectSignals(when: When, out: Set<string>): void {
  if ("all" in when) {
    for (const cond of when.all) {
      out.add(cond.signal);
    }
  } else {
    out.add(when.signal);
  }
}

/** Collect all conditions from a rule (flattens { all }). */
export function conditionsOf(rule: Rule): Condition[] {
  if ("all" in rule.when) {
    return [...rule.when.all];
  }
  return [rule.when];
}
