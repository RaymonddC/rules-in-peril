import type { Outcome, RuleView } from "./types";

// Reads a rules.json the user picked. The file is read in this tab and never
// leaves it (R1): no upload, no storage, no logging.
//
// This only checks the outer shape so the Start screen can list the rules.
// Real validation is parseRules in packages/core (rule-engine spec); call it
// here once the engine exists and show its errors as they are.

export type LoadResult =
  | { ok: true; fileName: string; rules: RuleView[] }
  | { ok: false; fileName: string; message: string };

const OUTCOMES: readonly Outcome[] = ["reject", "review", "approve"];

interface RawCondition {
  signal: string;
  op: string;
  value: unknown;
}

function isCondition(x: unknown): x is RawCondition {
  if (typeof x !== "object" || x === null) return false;
  const c = x as Record<string, unknown>;
  return typeof c.signal === "string" && typeof c.op === "string" && "value" in c;
}

function conditionCode(when: unknown): string | null {
  if (isCondition(when)) return `${when.signal} ${when.op} ${String(when.value)}`;
  if (typeof when === "object" && when !== null && Array.isArray((when as { all?: unknown }).all)) {
    const parts = (when as { all: unknown[] }).all.map(conditionCode);
    if (parts.length === 0 || parts.some((p) => p === null)) return null;
    return parts.join(" and ");
  }
  return null;
}

/** "maildrop-new-file" -> "Maildrop new file", so a file's ids read as words. */
function humanize(id: string): string {
  const words = id.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function loadRulesFile(file: File): Promise<LoadResult> {
  const fileName = file.name;
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, fileName, message: "This file is not valid JSON." };
  }
  const list = (data as { rules?: unknown } | null)?.rules;
  if (!Array.isArray(list)) {
    return { ok: false, fileName, message: "Expected an object with a \"rules\" list." };
  }
  const rules: RuleView[] = [];
  for (const [i, raw] of list.entries()) {
    const r = raw as { id?: unknown; when?: unknown; then?: unknown };
    const code = conditionCode(r.when);
    if (typeof r.id !== "string" || r.id === "" || code === null || !OUTCOMES.includes(r.then as Outcome)) {
      return { ok: false, fileName, message: `Rule ${i + 1} needs an id, a when and a then of reject, review or approve.` };
    }
    rules.push({ id: r.id, plain: humanize(r.id), code, then: r.then as Outcome });
  }
  return { ok: true, fileName, rules };
}
