import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { parseRules, runWorld } from "@rip/core";
import { makeIgorWorld } from "../../world/index";
import { IGOR_SCHEMA } from "../../world/schema";
import { draftsProblem, starterDrafts, toRuleViews, type DraftRule } from "./rule-builder";
import { rulePacks, sampleRun, SAMPLE_SEED, starterFintech } from "./sample-run";
import { engineRunToLabRun } from "./adapter";
import type { Fix, LabRun, RulePack, RuleView } from "./types";

interface UploadedRules {
  fileName: string;
  rules: RuleView[];
}

/** Where the rules come from: a ready-made pack, the sentence builder, or a file. */
export type RuleSource = "pack" | "build" | "file";

interface LabState {
  seed: string;
  setSeed: (seed: string) => void;
  source: RuleSource;
  setSource: (s: RuleSource) => void;
  packId: string;
  setPackId: (id: string) => void;
  uploaded: UploadedRules | null;
  setUploaded: (u: UploadedRules | null) => void;
  drafts: DraftRule[];
  setDrafts: (d: DraftRule[]) => void;
  /** The rules the next run uses. */
  activeRules: { name: string; rules: RuleView[] };
  /** Why the rules can't run yet, in plain words, or null when they can. */
  notReady: string | null;
  run: LabRun | null;
  raise: () => void;
  /** True when the run shown is the sample, not what the user asked for. */
  isSampleStandIn: boolean;
  chosenFixId: Fix["id"];
  setChosenFixId: (id: Fix["id"]) => void;
  buried: boolean;
  bury: () => void;
  /** True right after Raise the monsters, until the Lab has played the attack. */
  playAttack: boolean;
  attackPlayed: () => void;
}

const Ctx = createContext<LabState | null>(null);

// ---------------------------------------------------------------------------
// parseConditionCode
// ---------------------------------------------------------------------------
// Converts a human code string like "docScore < 40 and age > 18" back into
// a When clause for the rule engine. Used when rules come from RuleView (pack
// or file) and need to be validated by parseRules before running.
//
// Supported formats (from the rule-builder and load-rules):
//   "signal op value"
//   "signal op value and signal op value [...]"

type ParsedWhen =
  | { signal: string; op: string; value: string | number | boolean }
  | { all: { signal: string; op: string; value: string | number | boolean }[] };

function parseOneCondition(text: string): { signal: string; op: string; value: string | number | boolean } | null {
  const match = /^(\w+)\s*(=|!=|<=|>=|<|>)\s*(.+)$/.exec(text.trim());
  if (!match) return null;
  const [, signal, op, rawValue] = match as unknown as [string, string, string, string];
  let value: string | number | boolean = rawValue.trim();
  if (value === "true") value = true;
  else if (value === "false") value = false;
  else if (!isNaN(Number(value))) value = Number(value);
  return { signal, op, value };
}

function parseConditionCode(code: string): ParsedWhen {
  const parts = code.split(/\s+and\s+/i);
  if (parts.length === 1) {
    return parseOneCondition(parts[0]!) ?? { signal: "__invalid__", op: "=", value: 0 };
  }
  const all = parts.map((p) => parseOneCondition(p) ?? { signal: "__invalid__", op: "=", value: 0 });
  return { all };
}


export function LabProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState(String(SAMPLE_SEED));
  const [source, setSource] = useState<RuleSource>("pack");
  const [packId, setPackId] = useState(starterFintech.id);
  const [uploaded, setUploaded] = useState<UploadedRules | null>(null);
  const [drafts, setDrafts] = useState<DraftRule[]>(starterDrafts);
  const [run, setRun] = useState<LabRun | null>(null);
  const [runAsked, setRunAsked] = useState<{ seed: string; custom: boolean } | null>(null);
  const [chosenFixId, setChosenFixId] = useState<Fix["id"]>("B");
  const [buried, setBuried] = useState(false);
  const [playAttack, setPlayAttack] = useState(false);

  const pack: RulePack = rulePacks.find((p) => p.id === packId) ?? starterFintech;

  const value = useMemo<LabState>(() => {
    let activeRules: LabState["activeRules"];
    let notReady: string | null = null;
    if (source === "build") {
      activeRules = { name: "Your rules", rules: toRuleViews(drafts) };
      notReady = draftsProblem(drafts);
    } else if (source === "file") {
      activeRules = uploaded ? { name: uploaded.fileName, rules: uploaded.rules } : { name: "No file yet", rules: [] };
      if (!uploaded) notReady = "Drop a rules.json first, or pick another way to bring rules.";
    } else {
      activeRules = { name: pack.name, rules: pack.rules };
    }

    return {
      seed,
      setSeed,
      source,
      setSource,
      packId,
      setPackId,
      uploaded,
      setUploaded,
      drafts,
      setDrafts,
      activeRules,
      notReady,
      run,
      // Run the world for this seed and these rules.
      // Falls back to the seed 1818 sample when parsing fails.
      raise: () => {
        const numericSeed = Number(seed);
        const rulesJson = { rules: activeRules.rules.map((rv) => ({
          id: rv.id,
          when: parseConditionCode(rv.code),
          then: rv.then,
        })) };
        const parseResult = parseRules(rulesJson, IGOR_SCHEMA);
        if (!parseResult.ok) {
          // Fallback to sample if the rules can't be parsed (e.g. from builder)
          setRun(sampleRun);
        } else {
          const ruleSet = parseResult.ruleSet;
          const world = makeIgorWorld(numericSeed, 880, 120);
          const report = runWorld(world, ruleSet, numericSeed);
          const labRun = engineRunToLabRun(
            world,
            report,
            ruleSet,
            activeRules.rules,
            numericSeed,
            source === "pack" ? packId : "custom",
          );
          setRun(labRun);
        }
        setRunAsked({ seed, custom: source !== "pack" });
        setBuried(false);
        setPlayAttack(true);
      },
      isSampleStandIn: runAsked !== null && (runAsked.custom || Number(runAsked.seed) !== SAMPLE_SEED),
      chosenFixId,
      setChosenFixId,
      buried,
      bury: () => setBuried(true),
      playAttack,
      attackPlayed: () => setPlayAttack(false),
    };
  }, [seed, source, packId, uploaded, drafts, pack, run, runAsked, chosenFixId, buried, playAttack]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLab(): LabState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLab must be used inside LabProvider");
  return v;
}

/** The run to show. Screens past Start fall back to the sample so deep links work. */
export function useRun(): LabRun {
  return useLab().run ?? sampleRun;
}
