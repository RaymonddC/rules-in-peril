export type SignalValue = number | boolean | string;
export type Signals = Readonly<Record<string, SignalValue>>;

export type SignalType =
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly string[] };
export type SignalSchema = Readonly<Record<string, SignalType>>;

export type Outcome = "reject" | "review" | "approve";
export type Op = "=" | "!=" | "<" | "<=" | ">" | ">=";

export interface Condition {
  signal: string;
  op: Op;
  value: SignalValue;
}

export type When = Condition | { all: readonly Condition[] };

export interface Rule {
  id: string;
  when: When;
  then: Outcome;
}

export interface RuleSet {
  rules: readonly Rule[];
}

/** ruleId is null when the verdict is the default. */
export interface Verdict {
  outcome: Outcome;
  ruleId: string | null;
}

export interface RuleError {
  ruleIndex: number | null;
  ruleId: string | null;
  message: string;
}

export type ParseResult =
  | { ok: true; ruleSet: RuleSet }
  | { ok: false; errors: RuleError[] };

export const DEFAULT_OUTCOME: Outcome = "approve";
