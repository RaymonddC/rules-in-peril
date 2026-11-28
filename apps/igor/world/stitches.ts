// Igor world stitch types and stitch-to-signals conversion.
// No DOM, no React, no Node built-ins.

import type { Signals } from "@rip/core";

// ---------------------------------------------------------------------------
// Stitch type
// ---------------------------------------------------------------------------

/**
 * Each stitch is one part of an identity. A monster is built from several stitches.
 *
 * Key design:
 * - `idNumber` stitch sets registry (mismatch if borrowed).
 * - `name` stitch carries the stated age (from the application form).
 *   A borrowed idNumber with a made-up name means registry=mismatch but
 *   age reflects what the applicant wrote, NOT the actual age of the ID's owner.
 *   This is the demo blind spot: no starter-pack rule reads `registry`.
 * - `docScore` is on the idNumber stitch — better documents get higher scores.
 */
export type IgorStitch =
  | { part: "idNumber"; kind: "borrowed" | "invented"; docScore: number }
  | { part: "name"; statedAge: number }
  | { part: "phone"; ageDays: number }
  | { part: "email"; ageDays: number }
  | { part: "device"; idsInWindow: number }
  | { part: "address"; addressType: "residential" | "maildrop" | "commercial"; idsInWindow: number }
  | { part: "network"; ipType: "home" | "mobile" | "datacenter" | "vpn" }
  | { part: "file"; ageMonths: number; authorizedUserOnly: boolean }
  | { part: "speed"; fillSeconds: number };

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: Signals = {
  registry: "match",
  docScore: 75,
  age: 30,
  fileAgeMonths: 24,
  authorizedUserOnly: false,
  phoneAgeDays: 180,
  emailAgeDays: 180,
  deviceIds24h: 1,
  addressIds30d: 1,
  addressType: "residential",
  ipType: "home",
  fillSeconds: 45,
};

// ---------------------------------------------------------------------------
// stitchesToSignals
// ---------------------------------------------------------------------------

/**
 * Build a single Signals record from a list of stitches.
 * Stitches are applied left-to-right; later ones override earlier ones.
 * Absent stitches fall back to DEFAULTS.
 */
export function stitchesToSignals(stitches: readonly IgorStitch[]): Signals {
  let registry: string = DEFAULTS["registry"] as string;
  let docScore: number = DEFAULTS["docScore"] as number;
  let age: number = DEFAULTS["age"] as number;
  let fileAgeMonths: number = DEFAULTS["fileAgeMonths"] as number;
  let authorizedUserOnly: boolean = DEFAULTS["authorizedUserOnly"] as boolean;
  let phoneAgeDays: number = DEFAULTS["phoneAgeDays"] as number;
  let emailAgeDays: number = DEFAULTS["emailAgeDays"] as number;
  let deviceIds24h: number = DEFAULTS["deviceIds24h"] as number;
  let addressIds30d: number = DEFAULTS["addressIds30d"] as number;
  let addressType: string = DEFAULTS["addressType"] as string;
  let ipType: string = DEFAULTS["ipType"] as string;
  let fillSeconds: number = DEFAULTS["fillSeconds"] as number;

  for (const stitch of stitches) {
    switch (stitch.part) {
      case "idNumber":
        docScore = stitch.docScore;
        // A borrowed ID number means the registry record belongs to someone else.
        // The name on the application won't match the actual owner → mismatch.
        registry = stitch.kind === "borrowed" ? "mismatch" : "match";
        break;
      case "name":
        // The stated age comes from the application form (name + birth date).
        age = stitch.statedAge;
        break;
      case "phone":
        phoneAgeDays = stitch.ageDays;
        break;
      case "email":
        emailAgeDays = stitch.ageDays;
        break;
      case "device":
        deviceIds24h = stitch.idsInWindow;
        break;
      case "address":
        addressType = stitch.addressType;
        addressIds30d = stitch.idsInWindow;
        break;
      case "network":
        ipType = stitch.ipType;
        break;
      case "file":
        fileAgeMonths = stitch.ageMonths;
        authorizedUserOnly = stitch.authorizedUserOnly;
        break;
      case "speed":
        fillSeconds = stitch.fillSeconds;
        break;
    }
  }

  return {
    registry,
    docScore,
    age,
    fileAgeMonths,
    authorizedUserOnly,
    phoneAgeDays,
    emailAgeDays,
    deviceIds24h,
    addressIds30d,
    addressType,
    ipType,
    fillSeconds,
  };
}

// ---------------------------------------------------------------------------
// signalsChangedByStitch
// ---------------------------------------------------------------------------

/** Which signals does this stitch contribute? Used by autopsy blind-spot detection. */
export function signalsChangedByStitch(stitch: IgorStitch): string[] {
  switch (stitch.part) {
    case "idNumber":
      return ["registry", "docScore"];
    case "name":
      return ["age"];
    case "phone":
      return ["phoneAgeDays"];
    case "email":
      return ["emailAgeDays"];
    case "device":
      return ["deviceIds24h"];
    case "address":
      return ["addressType", "addressIds30d"];
    case "network":
      return ["ipType"];
    case "file":
      return ["fileAgeMonths", "authorizedUserOnly"];
    case "speed":
      return ["fillSeconds"];
  }
}
