// parseRules: validates a rules input against a SignalSchema.
// Never throws. Returns a RuleSet or a list of RuleErrors.

import { z } from "zod";
import type { ParseResult, RuleError, SignalSchema } from "./types";

const OpSchema = z.enum(["=", "!=", "<", "<=", ">", ">="]);
const OutcomeSchema = z.enum(["reject", "review", "approve"]);

const ConditionSchema = z.strictObject({
  signal: z.string(),
  op: OpSchema,
  value: z.union([z.number(), z.boolean(), z.string()]),
});

const WhenSchema = z.union([
  ConditionSchema,
  z.strictObject({ all: z.array(ConditionSchema).min(1) }),
]);

const RuleInputSchema = z.strictObject({
  id: z.string().min(1),
  when: WhenSchema,
  then: OutcomeSchema,
});

const RulesFileSchema = z.strictObject({
  rules: z.array(RuleInputSchema),
});

type ConditionInput = z.infer<typeof ConditionSchema>;

/** Validate a single condition against the signal schema. */
function checkCondition(
  cond: ConditionInput,
  schema: SignalSchema,
  ruleIndex: number,
  ruleId: string | null,
  errors: RuleError[],
): void {
  const sigType = schema[cond.signal];
  if (!sigType) {
    errors.push({
      ruleIndex,
      ruleId,
      message: `Unknown signal "${cond.signal}". Valid signals: ${Object.keys(schema).join(", ")}.`,
    });
    return;
  }

  if (sigType.kind === "number") {
    if (typeof cond.value !== "number" || !Number.isFinite(cond.value)) {
      errors.push({ ruleIndex, ruleId, message: `Signal "${cond.signal}" is a number; value must be a finite number.` });
    }
    // All operators are valid for numbers.
  } else if (sigType.kind === "boolean") {
    if (typeof cond.value !== "boolean") {
      errors.push({ ruleIndex, ruleId, message: `Signal "${cond.signal}" is a boolean; value must be true or false.` });
    }
    if (cond.op !== "=" && cond.op !== "!=") {
      errors.push({ ruleIndex, ruleId, message: `Signal "${cond.signal}" is a boolean; only = and != are allowed.` });
    }
  } else if (sigType.kind === "enum") {
    if (typeof cond.value !== "string") {
      errors.push({ ruleIndex, ruleId, message: `Signal "${cond.signal}" is an enum; value must be a string.` });
    } else if (!sigType.values.includes(cond.value)) {
      errors.push({
        ruleIndex,
        ruleId,
        message: `"${cond.value}" is not a valid value for "${cond.signal}". Valid values: ${sigType.values.join(", ")}.`,
      });
    }
    if (cond.op !== "=" && cond.op !== "!=") {
      errors.push({ ruleIndex, ruleId, message: `Signal "${cond.signal}" is an enum; only = and != are allowed.` });
    }
  }
}

export function parseRules(input: unknown, schema: SignalSchema): ParseResult {
  try {
    const fileResult = RulesFileSchema.safeParse(input);
    if (!fileResult.success) {
      // Turn Zod errors into RuleErrors. We try to find the ruleIndex from the path.
      const errors: RuleError[] = fileResult.error.errors.map((e) => {
        const pathStr = e.path.join(".");
        // path like "rules.2.id" -> index 2
        const match = /^rules\.(\d+)/.exec(pathStr);
        const ruleIndex = match?.[1] !== undefined ? parseInt(match[1], 10) : null;
        return { ruleIndex, ruleId: null, message: `${pathStr ? pathStr + ": " : ""}${e.message}` };
      });
      return { ok: false, errors };
    }

    const { rules } = fileResult.data;

    // Check for duplicate or empty ids and validate conditions against schema.
    const errors: RuleError[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]!;
      const ruleId = rule.id;

      if (seenIds.has(ruleId)) {
        errors.push({ ruleIndex: i, ruleId, message: `Duplicate rule id "${ruleId}".` });
      } else {
        seenIds.add(ruleId);
      }

      const when = rule.when;
      if ("all" in when) {
        for (const cond of when.all) {
          checkCondition(cond, schema, i, ruleId, errors);
        }
      } else {
        checkCondition(when, schema, i, ruleId, errors);
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return { ok: true, ruleSet: { rules: rules as unknown as import("./types").Rule[] } };
  } catch (err) {
    return {
      ok: false,
      errors: [{ ruleIndex: null, ruleId: null, message: String(err) }],
    };
  }
}
