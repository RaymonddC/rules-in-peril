// Salt Circle world signal schema.
// No DOM, no React, no Node built-ins.

import type { SignalSchema } from "@rip/core";

export const SALT_SCHEMA: SignalSchema = {
  actionType: { kind: "enum", values: ["refund", "cancel", "query", "approve"] },
  amount: { kind: "number" },
  runningTotal: { kind: "number" },
};
