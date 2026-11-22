import { describe, expect, it } from "vitest";
import { evaluate, parseRules, runRules } from "./index.js";
import type { SignalSchema } from "./types.js";

// ---------------------------------------------------------------------------
// Shared fixtures — the data-model rules file from the design doc
// ---------------------------------------------------------------------------

const schema: SignalSchema = {
  score: { kind: "number" },
  ageDays: { kind: "number" },
  flagged: { kind: "boolean" },
  zone: { kind: "enum", values: ["local", "remote"] },
};

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

// ---------------------------------------------------------------------------
// Happy path — evaluation
// ---------------------------------------------------------------------------

describe("happy path evaluation", () => {
  const parsed = parseRules(rulesInput, schema);
  if (!parsed.ok) throw new Error("fixture rules failed to parse");
  const ruleSet = parsed.ruleSet;

  it("triggers low-score for score < 40", () => {
    const signals = { score: 10, ageDays: 10, flagged: false, zone: "local" };
    expect(evaluate(ruleSet, signals)).toEqual({ outcome: "reject", ruleId: "low-score" });
  });

  it("triggers new-and-remote for zone=remote AND ageDays < 3", () => {
    const signals = { score: 50, ageDays: 1, flagged: false, zone: "remote" };
    expect(evaluate(ruleSet, signals)).toEqual({ outcome: "review", ruleId: "new-and-remote" });
  });

  it("approves when neither rule matches", () => {
    const signals = { score: 50, ageDays: 10, flagged: false, zone: "local" };
    expect(evaluate(ruleSet, signals)).toEqual({ outcome: "approve", ruleId: null });
  });
});

// ---------------------------------------------------------------------------
// Boundary values
// ---------------------------------------------------------------------------

describe("boundary values", () => {
  const parsed = parseRules(rulesInput, schema);
  if (!parsed.ok) throw new Error("fixture rules failed to parse");
  const ruleSet = parsed.ruleSet;

  it("score = 40 does NOT match the < 40 rule", () => {
    const signals = { score: 40, ageDays: 10, flagged: false, zone: "local" };
    expect(evaluate(ruleSet, signals)).toEqual({ outcome: "approve", ruleId: null });
  });

  it("ageDays = 3 does NOT match the ageDays < 3 condition", () => {
    const signals = { score: 50, ageDays: 3, flagged: false, zone: "remote" };
    // zone=remote AND ageDays < 3: ageDays=3 fails the condition → no match
    expect(evaluate(ruleSet, signals)).toEqual({ outcome: "approve", ruleId: null });
  });

  it("ageDays = 3 DOES match a >= 3 condition", () => {
    const geSchema: SignalSchema = { ageDays: { kind: "number" } };
    const geRules = {
      rules: [
        { id: "senior", when: { signal: "ageDays", op: ">=", value: 3 }, then: "reject" },
      ],
    };
    const geParsed = parseRules(geRules, geSchema);
    if (!geParsed.ok) throw new Error("ge rules failed to parse");
    expect(evaluate(geParsed.ruleSet, { ageDays: 3 })).toEqual({
      outcome: "reject",
      ruleId: "senior",
    });
  });
});

// ---------------------------------------------------------------------------
// Empty rules list
// ---------------------------------------------------------------------------

describe("empty rules list", () => {
  it("parses successfully", () => {
    const result = parseRules({ rules: [] }, schema);
    expect(result.ok).toBe(true);
  });

  it("approves every member", () => {
    const result = parseRules({ rules: [] }, schema);
    if (!result.ok) throw new Error("empty rules failed to parse");
    const members = [
      { id: "alice", signals: { score: 10, ageDays: 1, flagged: true, zone: "remote" } },
      { id: "bob", signals: { score: 90, ageDays: 30, flagged: false, zone: "local" } },
    ];
    const verdicts = runRules(result.ruleSet, members);
    for (const { verdict } of verdicts) {
      expect(verdict).toEqual({ outcome: "approve", ruleId: null });
    }
  });
});

// ---------------------------------------------------------------------------
// Early approve shielding
// ---------------------------------------------------------------------------

describe("early approve shielding", () => {
  it("first approve shields a member from a later reject", () => {
    const shieldSchema: SignalSchema = { score: { kind: "number" } };
    const shieldRules = {
      rules: [
        // approve everyone with score >= 50 — comes first
        { id: "safe", when: { signal: "score", op: ">=", value: 50 }, then: "approve" },
        // reject everyone — would catch score >= 50 too if safe didn't shield them
        { id: "catch-all", when: { signal: "score", op: ">=", value: 0 }, then: "reject" },
      ],
    };
    const parsed = parseRules(shieldRules, shieldSchema);
    if (!parsed.ok) throw new Error("shield rules failed to parse");

    // score=70 hits "safe" first → approve
    expect(evaluate(parsed.ruleSet, { score: 70 })).toEqual({
      outcome: "approve",
      ruleId: "safe",
    });
    // score=30 misses "safe", hits "catch-all" → reject
    expect(evaluate(parsed.ruleSet, { score: 30 })).toEqual({
      outcome: "reject",
      ruleId: "catch-all",
    });
  });
});

// ---------------------------------------------------------------------------
// Load errors
// ---------------------------------------------------------------------------

describe("load errors", () => {
  it("rejects empty all: []", () => {
    const result = parseRules(
      { rules: [{ id: "r1", when: { all: [] }, then: "reject" }] },
      schema,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const result = parseRules(
      {
        rules: [
          { id: "dup", when: { signal: "score", op: "<", value: 10 }, then: "reject" },
          { id: "dup", when: { signal: "score", op: ">", value: 90 }, then: "reject" },
        ],
      },
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes("dup"))).toBe(true);
  });

  it("rejects empty id", () => {
    const result = parseRules(
      { rules: [{ id: "", when: { signal: "score", op: "<", value: 10 }, then: "reject" }] },
      schema,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unknown key in rule object", () => {
    const result = parseRules(
      {
        rules: [
          {
            id: "r1",
            when: { signal: "score", op: "<", value: 10 },
            then: "reject",
            extra: 1,
          },
        ],
      },
      schema,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unknown signal name", () => {
    const result = parseRules(
      { rules: [{ id: "r1", when: { signal: "doesNotExist", op: "=", value: 0 }, then: "reject" }] },
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes("doesNotExist"))).toBe(true);
  });

  it("rejects enum value outside the list", () => {
    const result = parseRules(
      { rules: [{ id: "r1", when: { signal: "zone", op: "=", value: "alien" }, then: "reject" }] },
      schema,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects < operator on a boolean signal", () => {
    const result = parseRules(
      { rules: [{ id: "r1", when: { signal: "flagged", op: "<", value: true }, then: "reject" }] },
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes("flagged"))).toBe(true);
  });

  it("rejects then with invalid value", () => {
    const result = parseRules(
      { rules: [{ id: "r1", when: { signal: "score", op: "<", value: 10 }, then: "maybe" }] },
      schema,
    );
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multiple errors reported together
// ---------------------------------------------------------------------------

describe("multiple errors in one file", () => {
  it("reports all errors, not just the first", () => {
    const result = parseRules(
      {
        rules: [
          // error 1: unknown signal
          { id: "r1", when: { signal: "ghost", op: "=", value: 0 }, then: "reject" },
          // error 2: duplicate id (same as r1)
          { id: "r1", when: { signal: "score", op: ">", value: 50 }, then: "approve" },
        ],
      },
      schema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Missing signal at runtime
// ---------------------------------------------------------------------------

describe("missing signal at runtime", () => {
  it("throws naming the member id and the missing signal", () => {
    const parsed = parseRules(rulesInput, schema);
    if (!parsed.ok) throw new Error("fixture rules failed to parse");

    // "alice" is missing the "score" signal that low-score reads
    const members = [{ id: "alice", signals: { ageDays: 5, flagged: false, zone: "local" } }];

    expect(() => runRules(parsed.ruleSet, members)).toThrowError(/alice/);
    expect(() => runRules(parsed.ruleSet, members)).toThrowError(/score/);
  });

  it("returns no verdicts at all when a member is missing a signal", () => {
    const parsed = parseRules(rulesInput, schema);
    if (!parsed.ok) throw new Error("fixture rules failed to parse");

    const members: { id: string; signals: Record<string, import("./types.js").SignalValue> }[] = [
      { id: "good", signals: { score: 50, ageDays: 10, flagged: false, zone: "local" } },
      { id: "bad", signals: { ageDays: 5, flagged: false, zone: "local" } }, // missing score
    ];

    let threw = false;
    let results: ReturnType<typeof runRules> = [];
    try {
      results = runRules(parsed.ruleSet, members);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(results).toHaveLength(0);
  });
});
