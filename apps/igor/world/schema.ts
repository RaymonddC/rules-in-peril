// Igor world signal schema.
// No DOM, no React, no Node built-ins.

import type { SignalSchema } from "@rip/core";

export const IGOR_SCHEMA: SignalSchema = {
  registry: { kind: "enum", values: ["match", "partial", "mismatch", "not_found"] },
  fileAgeMonths: { kind: "number" },
  authorizedUserOnly: { kind: "boolean" },
  phoneAgeDays: { kind: "number" },
  emailAgeDays: { kind: "number" },
  deviceIds24h: { kind: "number" },
  addressIds30d: { kind: "number" },
  addressType: { kind: "enum", values: ["residential", "maildrop", "commercial"] },
  ipType: { kind: "enum", values: ["home", "mobile", "datacenter", "vpn"] },
  docScore: { kind: "number" },
  fillSeconds: { kind: "number" },
  age: { kind: "number" },
};
