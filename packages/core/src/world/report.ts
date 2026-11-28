// Markdown report formatter. No file I/O — returns a string.
// No timestamps, no absolute paths: same input = same output byte for byte.

import type { RunReport } from "./types";

export function formatReport<S>(report: RunReport<S>): string {
  const { totals, byOutcome, ruleHits, walkers, seed } = report;

  const lines: string[] = [];
  lines.push(`# RIP run report`);
  lines.push(``);
  lines.push(`Seed: ${seed}`);
  lines.push(``);
  lines.push(`## Totals`);
  lines.push(``);
  lines.push(`| | Villagers | Monsters |`);
  lines.push(`|---|---|---|`);
  lines.push(`| Rejected | ${byOutcome.reject.villagers} | ${byOutcome.reject.monsters} |`);
  lines.push(`| Review | ${byOutcome.review.villagers} | ${byOutcome.review.monsters} |`);
  lines.push(`| Approved | ${byOutcome.approve.villagers} | ${byOutcome.approve.monsters} |`);
  lines.push(`| **Total** | **${totals.villagers}** | **${totals.monsters}** |`);
  lines.push(``);
  lines.push(`Monsters walked: **${totals.walked}** / ${totals.monsters}`);
  lines.push(``);

  lines.push(`## Rule hits`);
  lines.push(``);
  lines.push(`| Rule | Monsters caught | Villagers hit |`);
  lines.push(`|---|---|---|`);
  for (const h of ruleHits) {
    lines.push(`| ${h.ruleId} | ${h.monstersCaught} | ${h.villagersHit} |`);
  }
  lines.push(``);

  if (walkers.length > 0) {
    lines.push(`## Walkers`);
    lines.push(``);
    for (const w of walkers) {
      lines.push(`- Monster \`${w.monsterId}\`: ${w.stitches.length} stitches`);
    }
    lines.push(``);
  } else {
    lines.push(`## Walkers`);
    lines.push(``);
    lines.push(`No monsters walked.`);
    lines.push(``);
  }

  return lines.join("\n");
}
