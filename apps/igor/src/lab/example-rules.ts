// Help for people who have never written a rules.json.
//
// The file format is the rule engine's (tech.md, "Rule engine contract"):
// { "rules": [ { "id", "when", "then" } ] }, first match wins, default approve.
// The signal list is Igor's twelve signals from product.md. Their full value
// lists and ranges are set by the igor-world spec; the examples here are
// plain-language guidance, not limits.
//
// TODO(igor-world): once rules/starter-fintech.json exists, offer that file
// for download instead of this copy, so there is one source of truth.

export const exampleRulesFile = {
  rules: [
    { id: "low-doc-score", when: { signal: "docScore", op: "<", value: 40 }, then: "reject" },
    { id: "under-18", when: { signal: "age", op: "<", value: 18 }, then: "reject" },
    { id: "busy-device", when: { signal: "deviceIds24h", op: ">=", value: 3 }, then: "reject" },
    { id: "datacenter-ip", when: { signal: "ipType", op: "=", value: "datacenter" }, then: "review" },
    {
      id: "maildrop-new-file",
      when: {
        all: [
          { signal: "addressType", op: "=", value: "maildrop" },
          { signal: "fileAgeMonths", op: "=", value: 0 },
        ],
      },
      then: "reject",
    },
    {
      id: "new-phone-and-email",
      when: {
        all: [
          { signal: "phoneAgeDays", op: "<", value: 3 },
          { signal: "emailAgeDays", op: "<", value: 3 },
        ],
      },
      then: "review",
    },
    { id: "fast-form", when: { signal: "fillSeconds", op: "<", value: 20 }, then: "reject" },
  ],
} as const;

export const exampleRulesText = JSON.stringify(exampleRulesFile, null, 2);

export interface SignalHelp {
  name: string;
  /** Short plain name for the form. */
  label: string;
  kind: "number" | "boolean" | "enum";
  meaning: string;
  /** For enum signals: the values known so far. The igor-world spec sets the full lists. */
  values?: string[];
  /** A sensible starting value when someone picks this signal. */
  start: string;
}

export const SIGNALS: SignalHelp[] = [
  { name: "registry", label: "Registry check", kind: "enum", meaning: "Do the name and birth date match the Vesper registry record for this ID number?", values: ["match", "partial", "mismatch", "not_found"], start: "mismatch" },
  { name: "docScore", label: "ID document score", kind: "number", meaning: "Score of the ID document check. Higher is better.", start: "40" },
  { name: "age", label: "Age", kind: "number", meaning: "Age in years, from the birth date the applicant typed.", start: "18" },
  { name: "fileAgeMonths", label: "Credit file age (months)", kind: "number", meaning: "How old the applicant’s credit file is, in months. 0 means no file yet.", start: "0" },
  { name: "authorizedUserOnly", label: "File only as an added user", kind: "boolean", meaning: "The credit file exists only because someone added this person to their account.", start: "true" },
  { name: "phoneAgeDays", label: "Phone number age (days)", kind: "number", meaning: "Days since this phone number was first seen.", start: "3" },
  { name: "emailAgeDays", label: "Email age (days)", kind: "number", meaning: "Days since this email address was first seen.", start: "3" },
  { name: "deviceIds24h", label: "People on this device (24 h)", kind: "number", meaning: "How many identities used this device in the last 24 hours.", start: "3" },
  { name: "addressIds30d", label: "People at this address (30 days)", kind: "number", meaning: "How many identities used this address in the last 30 days.", start: "5" },
  { name: "addressType", label: "Address type", kind: "enum", meaning: "What kind of address it is.", values: ["maildrop"], start: "maildrop" },
  { name: "ipType", label: "Network type", kind: "enum", meaning: "What kind of network the sign-up came from.", values: ["datacenter"], start: "datacenter" },
  { name: "fillSeconds", label: "Time to fill the form (seconds)", kind: "number", meaning: "Seconds the applicant took to fill in the form.", start: "20" },
];

export type Op = "=" | "!=" | "<" | "<=" | ">" | ">=";

export const OPERATORS: { op: Op; words: string; numbersOnly: boolean }[] = [
  { op: "<", words: "is less than", numbersOnly: true },
  { op: "<=", words: "is at most", numbersOnly: true },
  { op: ">", words: "is more than", numbersOnly: true },
  { op: ">=", words: "is at least", numbersOnly: true },
  { op: "=", words: "is", numbersOnly: false },
  { op: "!=", words: "is not", numbersOnly: false },
];

export const OUTCOMES: { then: "reject" | "review" | "approve"; label: string; words: string }[] = [
  { then: "reject", label: "Reject", words: "Turn the applicant away." },
  { then: "review", label: "Send to review", words: "Hold the applicant for a person to check." },
  { then: "approve", label: "Approve", words: "Let the applicant in, and skip the rules below." },
];
