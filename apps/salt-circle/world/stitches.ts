// Salt Circle world stitch types and stitch-to-records conversion.
// No DOM, no React, no Node built-ins.

import type { Signals } from "@rip/core";

/** One action in an agent task. */
export interface SaltStitch {
  actionType: "refund" | "cancel" | "query" | "approve";
  amount: number;
}

/**
 * Build signal records from a list of stitches.
 * One record per stitch, with runningTotal accumulated left to right.
 * runningTotal includes the current action's amount if it is a refund.
 */
export function stitchesToRecords(stitches: readonly SaltStitch[]): readonly Signals[] {
  let runningTotal = 0;
  return stitches.map((stitch) => {
    if (stitch.actionType === "refund") {
      runningTotal += stitch.amount;
    }
    return {
      actionType: stitch.actionType,
      amount: stitch.amount,
      runningTotal,
    };
  });
}

/**
 * Which signals does this stitch contribute?
 * Every stitch sets all three signals (the guardrail can read any of them).
 */
export function signalsChangedByStitch(
  _stitch: SaltStitch,
  _index: number,
): string[] {
  return ["actionType", "amount", "runningTotal"];
}
