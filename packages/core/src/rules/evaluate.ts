import type { Condition, RuleSet, Signals, Verdict, When } from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract all Condition objects from a When (plain or compound). */
function getConditions(when: When): readonly Condition[] {
  if ("all" in when) return when.all;
  return [when];
}

/** Evaluate one Condition against the signals map. Throws if the signal is absent. */
function evalCondition(cond: Condition, signals: Signals): boolean {
  if (!(cond.signal in signals)) {
    throw new Error(`missing signal: "${cond.signal}"`);
  }
  const sv = signals[cond.signal];
  const cv = cond.value;

  switch (cond.op) {
    case "=":
      return sv === cv;
    case "!=":
      return sv !== cv;
    case "<":
      return (sv as number) < (cv as number);
    case "<=":
      return (sv as number) <= (cv as number);
    case ">":
      return (sv as number) > (cv as number);
    case ">=":
      return (sv as number) >= (cv as number);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a single `When` against a signals map.
 * Throws with a message naming the signal if any required signal is absent.
 */
export function matches(when: When, signals: Signals): boolean {
  const conditions = getConditions(when);
  for (const cond of conditions) {
    if (!evalCondition(cond, signals)) return false;
  }
  return true;
}

/**
 * Find the first rule whose `when` matches and return its verdict.
 * Returns `{ outcome: "approve", ruleId: null }` when no rule matches.
 * Throws when a condition reads a signal that is absent from `signals`.
 */
export function evaluate(ruleSet: RuleSet, signals: Signals): Verdict {
  for (const rule of ruleSet.rules) {
    if (matches(rule.when, signals)) {
      return { outcome: rule.then, ruleId: rule.id };
    }
  }
  return { outcome: "approve", ruleId: null };
}

/**
 * Run the rule set over an ordered list of members.
 * Returns one `{ memberId, verdict }` per member in the same order.
 * If any member is missing a signal that a rule reads, adds the member id to
 * the error and re-throws — no results are returned for the entire call.
 */
export function runRules(
  ruleSet: RuleSet,
  members: readonly { id: string; signals: Signals }[],
): { memberId: string; verdict: Verdict }[] {
  const results: { memberId: string; verdict: Verdict }[] = [];

  for (const member of members) {
    try {
      const verdict = evaluate(ruleSet, member.signals);
      results.push({ memberId: member.id, verdict });
    } catch (err) {
      const base = err instanceof Error ? err.message : String(err);
      throw new Error(`member "${member.id}": ${base}`);
    }
  }

  return results;
}

/**
 * Return the sorted, deduplicated list of signal names read by any condition
 * in the rule set.
 */
export function signalsRead(ruleSet: RuleSet): string[] {
  const names = new Set<string>();
  for (const rule of ruleSet.rules) {
    for (const cond of getConditions(rule.when)) {
      names.add(cond.signal);
    }
  }
  return [...names].sort();
}
