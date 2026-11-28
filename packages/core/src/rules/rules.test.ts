// Example tests for the rule engine.
// Feature: rule-engine

import { describe, expect, it } from "vitest";
import { evaluate, matches, parseRules, runRules, signalsRead } from "./index";
import type { RuleSet, SignalSchema } from "./types";

const schema: SignalSchema = {
  score: { kind: "number" },
  ageDays: { kind: "number" },
  flagged: { kind: "boolean" },
  zone: { kind: "enum", values: ["local", "remote"] },
};

// The rules file from the design doc.
const rulesInput = {
  rules: [
    { id: "low-score", when: { signal: "score", op: "<", value: 40 }, then: "reject" },
    {
      id: "new-and-remote",
      when: {
        all: [
          { signal: "zone", op: "=", value: "remote" },
          { signal: "ageDays", op: "<", value: 3 },
        ],
      },
      then: "review",
    },
  ],
};

describe("parseRules", () => {
  it("accepts the design doc example", () => {
    const r = parseRules(rulesInput, schema);
    expect(r.ok).toBe(true);
  });

  it("accepts an empty rules list", () => {
    const r = parseRules({ rules: [] }, schema);
    expect(r.ok).toBe(true);
  });

  it("rejects an empty id", () => {
    const r = parseRules({ rules: [{ id: "", when: { signal: "score", op: "<", value: 10 }, then: "reject" }] }, schema);
    expect(r.ok).toBe(false);
  });

  it("rejects a duplicate id", () => {
    const r = parseRules(
      {
        rules: [
          { id: "dup", when: { signal: "score", op: "<", value: 10 }, then: "reject" },
          { id: "dup", when: { signal: "score", op: ">", value: 90 }, then: "approve" },
        ],
      },
      schema,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.message.includes("dup"))).toBe(true);
    }
  });

  it("rejects an unknown signal", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { signal: "UNKNOWN", op: "=", value: 1 }, then: "reject" }] }, schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.ruleIndex === 0)).toBe(true);
    }
  });

  it("rejects an unknown key inside a rule", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { signal: "score", op: "<", value: 10 }, then: "reject", extra: true }] }, schema);
    expect(r.ok).toBe(false);
  });

  it("rejects < on a boolean", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { signal: "flagged", op: "<", value: true }, then: "reject" }] }, schema);
    expect(r.ok).toBe(false);
  });

  it("rejects an enum value outside the list", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { signal: "zone", op: "=", value: "OUTER_SPACE" }, then: "reject" }] }, schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.message.includes("OUTER_SPACE"))).toBe(true);
    }
  });

  it("rejects < on an enum", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { signal: "zone", op: "<", value: "local" }, then: "reject" }] }, schema);
    expect(r.ok).toBe(false);
  });

  it("rejects an empty 'all' list", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { all: [] }, then: "reject" }] }, schema);
    expect(r.ok).toBe(false);
  });

  it("rejects a 'then' outside the three outcomes", () => {
    const r = parseRules({ rules: [{ id: "r1", when: { signal: "score", op: "<", value: 10 }, then: "YEET" }] }, schema);
    expect(r.ok).toBe(false);
  });

  it("reports both errors when two rules have problems", () => {
    const r = parseRules(
      {
        rules: [
          { id: "r1", when: { signal: "MISSING1", op: "=", value: 1 }, then: "reject" },
          { id: "r2", when: { signal: "MISSING2", op: "=", value: 1 }, then: "review" },
        ],
      },
      schema,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("never throws for any input", () => {
    for (const v of [null, undefined, 42, "string", [], {}, { rules: null }]) {
      expect(() => parseRules(v, schema)).not.toThrow();
    }
  });
});

describe("evaluate", () => {
  const { ruleSet } = (() => {
    const r = parseRules(rulesInput, schema);
    if (!r.ok) throw new Error("setup failed");
    return r;
  })();

  it("fires the first matching rule", () => {
    const v = evaluate(ruleSet, { score: 10, ageDays: 1, flagged: false, zone: "local" });
    expect(v.outcome).toBe("reject");
    expect(v.ruleId).toBe("low-score");
  });

  it("fires the second rule when the first does not match", () => {
    const v = evaluate(ruleSet, { score: 50, ageDays: 1, flagged: false, zone: "remote" });
    expect(v.outcome).toBe("review");
    expect(v.ruleId).toBe("new-and-remote");
  });

  it("approves by default when no rule matches", () => {
    const v = evaluate(ruleSet, { score: 50, ageDays: 10, flagged: false, zone: "local" });
    expect(v.outcome).toBe("approve");
    expect(v.ruleId).toBeNull();
  });

  it("boundary: score < 40 does not fire at exactly 40", () => {
    const v = evaluate(ruleSet, { score: 40, ageDays: 10, flagged: false, zone: "local" });
    expect(v.outcome).toBe("approve");
  });

  it("boundary: ageDays < 3 fires at 2 but not at 3", () => {
    const base = { score: 50, ageDays: 3, flagged: false, zone: "remote" } as const;
    expect(evaluate(ruleSet, { ...base, ageDays: 2 }).outcome).toBe("review");
    expect(evaluate(ruleSet, { ...base, ageDays: 3 }).outcome).toBe("approve");
  });

  it("an early approve shields from a later reject", () => {
    const shieldInput = {
      rules: [
        { id: "shield", when: { signal: "score", op: ">=", value: 80 }, then: "approve" },
        { id: "reject-all", when: { signal: "score", op: ">=", value: 0 }, then: "reject" },
      ],
    };
    const r = parseRules(shieldInput, schema);
    if (!r.ok) throw new Error("setup");
    const v = evaluate(r.ruleSet, { score: 90, ageDays: 0, flagged: false, zone: "local" });
    expect(v.outcome).toBe("approve");
    expect(v.ruleId).toBe("shield");
  });
});

describe("evaluate – missing signal", () => {
  it("throws when a member is missing a required signal", () => {
    const r = parseRules(rulesInput, schema);
    if (!r.ok) throw new Error("setup");
    // 'score' is missing
    expect(() => evaluate(r.ruleSet, { ageDays: 10, flagged: false, zone: "local" } as never, "m1")).toThrow(/"score"/);
  });
});

describe("runRules", () => {
  const ruleSet: RuleSet = (() => {
    const r = parseRules(rulesInput, schema);
    if (!r.ok) throw new Error("setup");
    return r.ruleSet;
  })();

  it("returns one verdict per member, in order", () => {
    const members = [
      { id: "a", signals: { score: 10, ageDays: 10, flagged: false, zone: "local" } },
      { id: "b", signals: { score: 90, ageDays: 10, flagged: false, zone: "local" } },
    ];
    const results = runRules(ruleSet, members);
    expect(results.map((r) => r.memberId)).toEqual(["a", "b"]);
    expect(results[0]!.verdict.outcome).toBe("reject");
    expect(results[1]!.verdict.outcome).toBe("approve");
  });

  it("throws and returns no results when a signal is missing", () => {
    const members = [{ id: "bad", signals: { ageDays: 1, flagged: false, zone: "remote" } as never }];
    expect(() => runRules(ruleSet, members)).toThrow();
  });
});

describe("signalsRead", () => {
  it("lists signals read, sorted, without duplicates", () => {
    const r = parseRules(rulesInput, schema);
    if (!r.ok) throw new Error("setup");
    expect(signalsRead(r.ruleSet)).toEqual(["ageDays", "score", "zone"]);
  });

  it("returns an empty array for an empty rule set", () => {
    const r = parseRules({ rules: [] }, schema);
    if (!r.ok) throw new Error("setup");
    expect(signalsRead(r.ruleSet)).toEqual([]);
  });
});

describe("matches", () => {
  it("single condition: = matches exact", () => {
    expect(matches({ signal: "zone", op: "=", value: "remote" }, { zone: "remote" })).toBe(true);
    expect(matches({ signal: "zone", op: "=", value: "remote" }, { zone: "local" })).toBe(false);
  });

  it("all: matches only when every condition matches", () => {
    const when = { all: [{ signal: "score", op: "<" as const, value: 40 }, { signal: "flagged", op: "=" as const, value: true }] };
    expect(matches(when, { score: 30, flagged: true })).toBe(true);
    expect(matches(when, { score: 30, flagged: false })).toBe(false);
    expect(matches(when, { score: 50, flagged: true })).toBe(false);
  });
});
