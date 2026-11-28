#!/usr/bin/env node
// RIP CLI — runs the Igor world against a rules file and writes reports/latest.md.
// File I/O is performed only here (packages/cli). No DOM, no browser APIs.
// Run with: vite-node packages/cli/src/run.ts <rules-file>

import * as fs from "node:fs";
import * as path from "node:path";

import { parseRules, runWorld, formatReport } from "@rip/core";

// vite-node resolves relative paths from the project root; use absolute paths.
// import.meta.url gives the current file's URL.
import { makeIgorWorld } from "../../../apps/igor/world/index";
import { IGOR_SCHEMA } from "../../../apps/igor/world/schema";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SEED = 1818;
const VILLAGER_COUNT = 880;
const MONSTER_COUNT = 120;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const rulesFilePath = process.argv[2];
if (!rulesFilePath) {
  console.error("Usage: rip <rules-file>");
  process.exit(1);
}

// Resolve relative to cwd
const resolvedPath = path.resolve(process.cwd(), rulesFilePath);

// Read rules file
let rawJson: unknown;
try {
  const text = fs.readFileSync(resolvedPath, "utf-8");
  rawJson = JSON.parse(text);
} catch (err) {
  console.error(`Could not read rules file "${resolvedPath}": ${String(err)}`);
  process.exit(1);
}

// Parse rules
const parseResult = parseRules(rawJson, IGOR_SCHEMA);
if (!parseResult.ok) {
  console.error(`Rules file is invalid:`);
  for (const e of parseResult.errors) {
    const loc = e.ruleIndex !== null ? ` (rule ${e.ruleIndex + 1})` : "";
    console.error(`  ${loc}${e.message}`);
  }
  process.exit(1);
}
const { ruleSet } = parseResult;

// Build world and run
const world = makeIgorWorld(SEED, VILLAGER_COUNT, MONSTER_COUNT);
const report = runWorld(world, ruleSet, SEED);

// Format and print report
const md = formatReport(report);
process.stdout.write(md + "\n");

// Write reports/latest.md
const reportsDir = path.resolve(process.cwd(), "reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}
fs.writeFileSync(path.join(reportsDir, "latest.md"), md, "utf-8");
console.error(`Report written to reports/latest.md`);

// The crypt re-run (exit 1 when a crypt monster walks) belongs to the crypt-and-cli spec.
console.error(`${report.totals.walked} of ${report.totals.monsters} monsters walked.`);
process.exit(0);
