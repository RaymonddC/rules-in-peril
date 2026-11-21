// The rule builder: rules as sentences ("If age is less than 18, reject"),
// for people who don't write JSON. Serves R8 (P1) in product.md.
//
// A draft becomes a normal rules file in the rule-engine format, so what
// someone builds here can be downloaded, committed to rules/, and run by the
// CLI like any other file.

import { exampleRulesFile, OPERATORS, SIGNALS, type Op, type SignalHelp } from "./example-rules";
import type { Outcome, RuleView } from "./types";

export interface DraftCondition {
  key: number;
  signal: string;
  op: Op;
  value: string;
}

export interface DraftRule {
  key: number;
  name: string;
  conditions: DraftCondition[];
  then: Outcome;
}

let nextKey = 1;
const key = () => nextKey++;

export function signalOf(name: string): SignalHelp {
  return SIGNALS.find((s) => s.name === name) ?? (SIGNALS[0] as SignalHelp);
}

/** Operators that make sense for this signal. Order words only work on numbers. */
export function opsFor(signal: string) {
  const kind = signalOf(signal).kind;
  return OPERATORS.filter((o) => kind === "number" || !o.numbersOnly);
}

export function newCondition(signal = "age"): DraftCondition {
  const s = signalOf(signal);
  return { key: key(), signal: s.name, op: s.kind === "number" ? "<" : "=", value: s.start };
}

export function newRule(): DraftRule {
  return { key: key(), name: "", conditions: [newCondition()], then: "reject" };
}

/** Change the signal and keep the operator and value valid for it. */
export function withSignal(c: DraftCondition, signal: string): DraftCondition {
  const s = signalOf(signal);
  const op = opsFor(signal).some((o) => o.op === c.op) ? c.op : s.kind === "number" ? "<" : "=";
  return { ...c, signal: s.name, op, value: s.start };
}

type FileCondition = { signal: string; op: string; value: string | number | boolean };
type FileWhen = FileCondition | { all: readonly FileCondition[] };

export function draftsFromFile(file: { rules: readonly { id: string; when: FileWhen; then: string }[] }): DraftRule[] {
  return file.rules.map((r) => {
    const list = "all" in r.when ? r.when.all : [r.when];
    return {
      key: key(),
      name: r.id,
      then: r.then as Outcome,
      conditions: list.map((c) => ({ key: key(), signal: c.signal, op: c.op as Op, value: String(c.value) })),
    };
  });
}

export function starterDrafts(): DraftRule[] {
  return draftsFromFile(exampleRulesFile);
}

/** A plain-words problem with this condition, or null when it is fine. */
export function conditionProblem(c: DraftCondition): string | null {
  const s = signalOf(c.signal);
  if (s.kind === "number") {
    if (c.value.trim() === "" || !Number.isFinite(Number(c.value))) return "Type a number.";
  } else if (c.value.trim() === "") {
    return "Pick a value.";
  }
  return null;
}

export function draftsProblem(drafts: DraftRule[]): string | null {
  for (const [i, r] of drafts.entries()) {
    if (r.conditions.length === 0) return `Rule ${i + 1} needs at least one condition.`;
    for (const c of r.conditions) {
      const p = conditionProblem(c);
      if (p) return `Rule ${i + 1}: ${p}`;
    }
  }
  return null;
}

const opWords = (op: Op) => OPERATORS.find((o) => o.op === op)?.words ?? op;
const outcomeWords: Record<Outcome, string> = { reject: "reject", review: "send to review", approve: "approve" };

function valueWords(c: DraftCondition): string {
  const s = signalOf(c.signal);
  if (s.kind === "boolean") return c.value === "true" ? "yes" : "no";
  return c.value;
}

export function sentence(r: DraftRule): string {
  // Lower-case the first letter so it reads as a sentence, but keep acronyms like "ID".
  const lead = (label: string) => (/^[A-Z]{2}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));
  const parts = r.conditions.map((c) => `${lead(signalOf(c.signal).label)} ${opWords(c.op)} ${valueWords(c)}`);
  return `If ${parts.join(" and ")}, ${outcomeWords[r.then]}.`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Ids the engine accepts: non-empty and unique. Named rules keep their name. */
function ids(drafts: DraftRule[]): string[] {
  const used = new Set<string>();
  return drafts.map((r, i) => {
    const base = slug(r.name) || `rule-${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  });
}

function fileValue(c: DraftCondition): string | number | boolean {
  const kind = signalOf(c.signal).kind;
  if (kind === "number") return Number(c.value);
  if (kind === "boolean") return c.value === "true";
  return c.value;
}

export function toRulesFile(drafts: DraftRule[]) {
  const idList = ids(drafts);
  return {
    rules: drafts.map((r, i) => {
      const conds = r.conditions.map((c) => ({ signal: c.signal, op: c.op, value: fileValue(c) }));
      return { id: idList[i] as string, when: conds.length === 1 ? conds[0] : { all: conds }, then: r.then };
    }),
  };
}

export function toRuleViews(drafts: DraftRule[]): RuleView[] {
  const idList = ids(drafts);
  return drafts.map((r, i) => ({
    id: idList[i] as string,
    plain: sentence(r),
    code: r.conditions.map((c) => `${c.signal} ${c.op} ${String(fileValue(c))}`).join(" and "),
    then: r.then,
  }));
}
