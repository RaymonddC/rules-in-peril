// Fix pricing. Pure TypeScript, no DOM, no Node built-ins.
// For each proposed fix, prepend its rule to the rule set, re-run the world,
// and compare villager reject/review counts to the baseline.

import { runWorld } from "../world/generate";
import type { RunReport, World } from "../world/types";
import type { Rule, RuleSet } from "../rules/types";

export interface ProposedFix {
  id: string;
  rule: Rule;
  label: string;
}

export interface PricedFix {
  id: string;
  label: string;
  /** Human-readable "signal op value" or compound condition. */
  ruleCode: string;
  /** Walkers remaining after this fix. */
  monstersWalk: number;
  /** Change in villagers rejected vs baseline (positive = more rejected). */
  villagersRejectedDelta: number;
  /** Change in villagers in review vs baseline (positive = more in review). */
  villagersReviewDelta: number;
}

function ruleToCode(rule: Rule): string {
  const when = rule.when;
  if ("all" in when) {
    return when.all.map((c) => `${c.signal} ${c.op} ${c.value}`).join(" and ");
  }
  return `${when.signal} ${when.op} ${when.value}`;
}

export function priceFixes<S>(
  world: World<S>,
  baseReport: RunReport<S>,
  baseRuleSet: RuleSet,
  fixes: readonly ProposedFix[],
  seed: number,
): readonly PricedFix[] {
  const baseVillagersRejected = baseReport.byOutcome.reject.villagers;
  const baseVillagersReview = baseReport.byOutcome.review.villagers;

  return fixes.map((fix) => {
    const extended: RuleSet = { rules: [fix.rule, ...baseRuleSet.rules] };
    const report = runWorld(world, extended, seed);

    return {
      id: fix.id,
      label: fix.label,
      ruleCode: ruleToCode(fix.rule),
      monstersWalk: report.totals.walked,
      villagersRejectedDelta: report.byOutcome.reject.villagers - baseVillagersRejected,
      villagersReviewDelta: report.byOutcome.review.villagers - baseVillagersReview,
    };
  });
}
