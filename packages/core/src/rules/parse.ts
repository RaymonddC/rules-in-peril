import { z } from "zod";
import type {
  Condition,
  Op,
  ParseResult,
  Rule,
  RuleError,
  RuleSet,
  SignalSchema,
  When,
} from "./types.js";

// ---------------------------------------------------------------------------
// Zod schemas — strict objects so unknown keys are errors
// ---------------------------------------------------------------------------

const opSchema = z.enum(["=", "!=", "<", "<=", ">", ">="]);
const outcomeSchema = z.enum(["reject", "review", "approve"]);

const conditionSchema = z
  .object({
    signal: z.string(),
    op: opSchema,
    value: z.union([z.number(), z.boolean(), z.string()]),
  })
  .strict();

const whenSchema = z.union([
  conditionSchema,
  z
    .object({
      all: z.array(conditionSchema).min(1, "all must contain at least one condition"),
    })
    .strict(),
]);

const ruleSchema = z
  .object({
    id: z.string(),
    when: whenSchema,
    then: outcomeSchema,
  })
  .strict();

const rulesInputSchema = z
  .object({
    rules: z.array(z.unknown()),
  })
  .strict();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectConditions(when: When): Condition[] {
  if ("all" in when) return [...when.all];
  return [when];
}

function peekId(raw: unknown): string | null {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "id" in raw &&
    typeof (raw as Record<string, unknown>)["id"] === "string"
  ) {
    return (raw as Record<string, unknown>)["id"] as string;
  }
  return null;
}

/** Validate type compatibility and operator compatibility for a condition. */
function checkConditionSemantics(
  cond: Condition,
  schema: SignalSchema,
  ruleIndex: number,
  ruleId: string | null,
  errors: RuleError[],
): void {
  const sigType = schema[cond.signal];

  // 1.4 — unknown signal
  if (sigType === undefined) {
    errors.push({
      ruleIndex,
      ruleId,
      message: `signal "${cond.signal}" is not in the schema`,
    });
    return; // further checks on this condition are not meaningful
  }

  const op = cond.op as Op;
  const orderOps: Op[] = ["<", "<=", ">", ">="];

  // 1.5 — type/op compatibility
  if (sigType.kind === "boolean") {
    if (orderOps.includes(op)) {
      errors.push({
        ruleIndex,
        ruleId,
        message: `operator "${op}" cannot be used with boolean signal "${cond.signal}"`,
      });
    }
    if (typeof cond.value !== "boolean") {
      errors.push({
        ruleIndex,
        ruleId,
        message: `signal "${cond.signal}" is boolean but value ${JSON.stringify(cond.value)} is not`,
      });
    }
  } else if (sigType.kind === "number") {
    if (typeof cond.value !== "number") {
      errors.push({
        ruleIndex,
        ruleId,
        message: `signal "${cond.signal}" is a number but value ${JSON.stringify(cond.value)} is not`,
      });
    }
  } else if (sigType.kind === "enum") {
    if (orderOps.includes(op)) {
      errors.push({
        ruleIndex,
        ruleId,
        message: `operator "${op}" cannot be used with enum signal "${cond.signal}"`,
      });
    }
    if (typeof cond.value !== "string" || !sigType.values.includes(cond.value)) {
      errors.push({
        ruleIndex,
        ruleId,
        message: `value ${JSON.stringify(cond.value)} is not in the enum for signal "${cond.signal}"`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseRules(input: unknown, schema: SignalSchema): ParseResult {
  const errors: RuleError[] = [];

  // ---- Top-level structure ------------------------------------------------
  const topResult = rulesInputSchema.safeParse(input);
  if (!topResult.success) {
    // Map Zod issues to RuleErrors with no ruleIndex
    const topErrors: RuleError[] = topResult.error.issues.map((issue) => ({
      ruleIndex: null,
      ruleId: null,
      message: issue.message,
    }));
    return { ok: false, errors: topErrors };
  }

  const rawRules: unknown[] = topResult.data.rules;

  // ---- Per-rule structural validation -------------------------------------
  // We want ALL errors from ALL rules, so we validate each independently.
  const validRules: Array<{ rule: Rule; index: number }> = [];

  for (let i = 0; i < rawRules.length; i++) {
    const rawRule = rawRules[i];
    const ruleId = peekId(rawRule);
    const ruleResult = ruleSchema.safeParse(rawRule);

    if (!ruleResult.success) {
      for (const issue of ruleResult.error.issues) {
        errors.push({
          ruleIndex: i,
          ruleId,
          message: issue.message,
        });
      }
    } else {
      // Cast through unknown to satisfy TypeScript — Zod's inferred type
      // matches our Rule interface structurally but isn't directly assignable
      // because of readonly arrays vs mutable arrays on `all`.
      validRules.push({ rule: ruleResult.data as unknown as Rule, index: i });
    }
  }

  // ---- Semantic checks (only for structurally valid rules) ----------------
  const seenIds = new Map<string, number>(); // id → first index

  for (const { rule, index } of validRules) {
    const ruleId = rule.id;

    // 1.6 — empty id
    if (ruleId === "") {
      errors.push({
        ruleIndex: index,
        ruleId: null,
        message: "rule id must not be empty",
      });
    } else {
      // 1.6 — duplicate id
      if (seenIds.has(ruleId)) {
        errors.push({
          ruleIndex: index,
          ruleId,
          message: `duplicate rule id "${ruleId}" (first seen at index ${seenIds.get(ruleId)})`,
        });
      } else {
        seenIds.set(ruleId, index);
      }
    }

    // 1.4, 1.5 — signal/type/op checks
    const conditions = collectConditions(rule.when);
    for (const cond of conditions) {
      checkConditionSemantics(cond, schema, index, ruleId || null, errors);
    }
  }

  // ---- Return -------------------------------------------------------------
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const ruleSet: RuleSet = {
    rules: validRules.map(({ rule }) => rule),
  };
  return { ok: true, ruleSet };
}
