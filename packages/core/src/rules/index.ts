// Rule engine types and functions
export type {
  Condition,
  Op,
  Outcome,
  ParseResult,
  Rule,
  RuleError,
  RuleSet,
  SignalSchema,
  SignalType,
  SignalValue,
  Signals,
  Verdict,
  When,
} from "./types";
export { DEFAULT_OUTCOME } from "./types";
export { parseRules } from "./parse";
export { evaluate, matches, runRules, signalsRead } from "./evaluate";

// World types and generation
export type {
  Member,
  Monster,
  OutcomeCounts,
  RecordVerdict,
  RuleHitCount,
  RunReport,
  Villager,
  WalkerSummary,
  World,
} from "../world/types";
export { makePrng, pick, randInt, runWorld, shuffle } from "../world/generate";
export { formatReport } from "../world/report";

// Shrink
export { shrink } from "../shrink/index";
export type { ShrinkResult } from "../shrink/index";

// Pricing
export { priceFixes } from "../pricing/index";
export type { PricedFix, ProposedFix } from "../pricing/index";
