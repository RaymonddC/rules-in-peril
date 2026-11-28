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
    value: z.union([
      z.number().refine(Number.isFinite, { message: "'value' must be a finite number" }),
      z.boolean(),
      z.string(),
    ]),
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
// Plain-words message mapping — never passes Zod library text to callers
// ---------------------------------------------------------------------------

type ZodIssue = z.ZodIssue;

/**
 * Return the best-matching inner issues from an `invalid_union` issue.
 * "Best" means the branch whose issues have the deepest path (most specific).
 */
function flattenUnionIssues(issue: ZodIssue): ZodIssue[] {
  if (issue.code !== "invalid_union") return [issue];
  const branches = (issue as z.core.$ZodIssueInvalidUnion).errors ?? [];
  if (branches.length === 0) return [issue];
  let best: ZodIssue[] = branches[0] ?? [issue];
  for (const branch of branches) {
    const bestDepth = Math.max(0, ...best.map((i) => i.path.length));
    const branchDepth = Math.max(0, ...branch.map((i) => i.path.length));
    if (branchDepth > bestDepth) best = branch;
  }
  return best.length > 0 ? best : [issue];
}

/** Safe helper: extract a string key from a path segment. */
function pathKey(seg: string | number | symbol): string {
  return String(seg);
}

/**
 * Translate one Zod issue into a plain-words message that names the
 * offending key. All five cases from Requirement 1.7 are covered.
 */
function zodIssueToMessage(issue: ZodIssue, contextPath: (string | number)[] = []): string {
  const fullPath: (string | number)[] = [
    ...contextPath,
    ...issue.path.map(pathKey),
  ];
  const keyName = fullPath.length > 0 ? String(fullPath[fullPath.length - 1]) : null;

  switch (issue.code) {
    case "unrecognized_keys": {
      const keys = (issue as z.core.$ZodIssueUnrecognizedKeys).keys ?? [];
      const keyStrings = keys.map(pathKey);
      if (keyStrings.length === 1) {
        return `unknown key "${keyStrings[0]}" is not allowed`;
      }
      return `unknown keys ${keyStrings.map((k) => `"${k}"`).join(", ")} are not allowed`;
    }

    case "invalid_value": {
      const values = (issue as z.core.$ZodIssueInvalidValue).values ?? [];
      const strValues = values.map(String);
      if (
        keyName === "then" ||
        (strValues.includes("reject") && strValues.includes("review") && strValues.includes("approve"))
      ) {
        return `'then' is missing or invalid: expected reject, review or approve`;
      }
      if (
        keyName === "op" ||
        strValues.every((v) => ["=", "!=", "<", "<=", ">", ">="].includes(v))
      ) {
        return `'op' is not valid: expected =, !=, <, <=, > or >=`;
      }
      return `'${keyName ?? "value"}' is not valid: expected one of ${strValues.map((v) => JSON.stringify(v)).join(", ")}`;
    }

    case "invalid_type": {
      // Zod 4 does not expose the received value directly on the issue;
      // extract it from the standard "Invalid input: expected X, received Y" message.
      const receivedMatch = issue.message.match(/received (\w+)$/);
      const receivedType = receivedMatch ? receivedMatch[1] : "unknown";
      if (keyName === "when") {
        return `'when' must be a condition object { signal, op, value } or { all: [...] }, got ${receivedType}`;
      }
      if (keyName === "value") {
        return `'value' is missing: expected a number, boolean or string`;
      }
      if (keyName === "rules") {
        return `'rules' must be an array`;
      }
      if (keyName === null) {
        const expected = (issue as z.core.$ZodIssueInvalidType).expected;
        return `expected ${String(expected)}, got ${receivedType}`;
      }
      return `'${keyName}' is missing or has the wrong type`;
    }

    case "invalid_union": {
      const inner = flattenUnionIssues(issue);
      const allExpectObject = inner.every(
        (i) => i.code === "invalid_type" && i.path.length === 0,
      );
      if (keyName === "when" && allExpectObject) {
        const firstInner = inner[0];
        if (firstInner) {
          const receivedMatch = firstInner.message.match(/received (\w+)$/);
          const receivedType = receivedMatch ? receivedMatch[1] : "unknown";
          return `'when' must be a condition object { signal, op, value } or { all: [...] }, got ${receivedType}`;
        }
      }
      // contextForInner: the path segments we know about minus the issue's own path
      // so inner issues that have no path still know their parent key
      const contextForInner = fullPath.slice(0, fullPath.length - issue.path.length);
      for (const innerIssue of inner) {
        // If the inner issue has no path, pass our current fullPath as its context
        // so it knows the key it belongs to
        const innerContext = innerIssue.path.length === 0 ? fullPath : contextForInner;
        const msg = zodIssueToMessage(innerIssue, innerContext);
        // Accept any message that is not a raw Zod pass-through
        if (!msg.startsWith("'input' is invalid")) return msg;
      }
      const firstIssue = inner[0];
      if (firstIssue) {
        const innerContext = firstIssue.path.length === 0 ? fullPath : contextForInner;
        return zodIssueToMessage(firstIssue, innerContext);
      }
      return `'${keyName ?? "input"}' is invalid`;
    }

    case "too_small": {
      if (keyName === "all") {
        return `'all' must contain at least one condition`;
      }
      return `'${keyName ?? "value"}' is too small`;
    }

    case "custom": {
      const pathSeg = fullPath.length > 0 ? String(fullPath[fullPath.length - 1]) : "value";
      const rawMsg = issue.message ?? "";
      if (rawMsg.includes("finite")) {
        return `'value' must be a finite number (Infinity and -Infinity are not allowed)`;
      }
      return `'${pathSeg}': ${rawMsg}`;
    }

    default: {
      const pathSeg = fullPath.length > 0 ? String(fullPath[fullPath.length - 1]) : "input";
      return `'${pathSeg}' is invalid`;
    }
  }
}

/**
 * Translate a list of Zod issues to `RuleError` objects, mapping every
 * issue through `zodIssueToMessage` so no Zod library text reaches callers.
 */
function zodIssuesToRuleErrors(
  issues: ZodIssue[],
  ruleIndex: number | null,
  ruleId: string | null,
): RuleError[] {
  return issues.map((issue) => ({
    ruleIndex,
    ruleId,
    message: zodIssueToMessage(issue),
  }));
}

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
  const sigType = Object.hasOwn(schema, cond.signal) ? schema[cond.signal] : undefined;

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
  try {
  const errors: RuleError[] = [];

  // ---- Top-level structure ------------------------------------------------
  const topResult = rulesInputSchema.safeParse(input);
  if (!topResult.success) {
    return { ok: false, errors: zodIssuesToRuleErrors(topResult.error.issues, null, null) };
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
      errors.push(...zodIssuesToRuleErrors(ruleResult.error.issues, i, ruleId));
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
  } catch {
    return { ok: false, errors: [{ ruleIndex: null, ruleId: null, message: "unexpected error during validation" }] };
  }
}
