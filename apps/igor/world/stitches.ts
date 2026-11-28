// Igor world stitch types and stitch-to-signals conversion.
// No DOM, no React, no Node built-ins.

import type { Signals } from "@rip/core";

// ---------------------------------------------------------------------------
// Stitch type
// ---------------------------------------------------------------------------

/**
 * Each stitch is one part of an identity. A monster is built from several stitches.
 *
 * - `idNumber`: the ID number and its document. A borrowed number belongs to a
 *   real Vesper resident (`ownerAge` is that resident's age). An invented one
 *   is not in the registry at all.
 * - `name`: the name and birth date typed on the form. It sets the stated age.
 *   With a borrowed number it makes the registry disagree: "mismatch" for a
 *   made-up name, "partial" for a close variant of the owner's own (`close`).
 */
export type IgorStitch =
  | { part: "idNumber"; kind: "borrowed" | "invented"; docScore: number; ownerAge?: number }
  | { part: "name"; statedAge: number; close?: boolean }
  | { part: "phone"; ageDays: number }
  | { part: "email"; ageDays: number }
  | { part: "device"; idsInWindow: number }
  | { part: "address"; addressType: "residential" | "maildrop" | "commercial"; idsInWindow: number }
  | { part: "network"; ipType: "home" | "mobile" | "datacenter" | "vpn" }
  | { part: "file"; ageMonths: number; authorizedUserOnly: boolean }
  | { part: "speed"; fillSeconds: number };

// ---------------------------------------------------------------------------
// Values when a stitch is absent
// ---------------------------------------------------------------------------
//
// Removing a stitch changes the signals in a defined way:
// - No ID number: there is no document to score (docScore 0) and nothing to
//   look up (registry "not_found").
// - No name: with a borrowed number, the applicant applies as the number's
//   real owner, so the registry matches and the age is the owner's. With no
//   number either, no birth date is given and the age reads as 0.
// - No credit file: fileAgeMonths 0.
// - Phone, email, device, address, network, speed: an ordinary value, the
//   kind most honest applicants show.

const ORDINARY = {
  phoneAgeDays: 180,
  emailAgeDays: 180,
  deviceIds24h: 1,
  addressIds30d: 1,
  addressType: "residential",
  ipType: "home",
  fillSeconds: 45,
} as const;

// ---------------------------------------------------------------------------
// stitchesToSignals
// ---------------------------------------------------------------------------

/** Build the one signal record of an applicant from its stitches. */
export function stitchesToSignals(stitches: readonly IgorStitch[]): Signals {
  const id = stitches.find((s) => s.part === "idNumber");
  const name = stitches.find((s) => s.part === "name");

  let registry: string;
  let docScore: number;
  let age: number;

  if (!id || id.part !== "idNumber") {
    registry = "not_found";
    docScore = 0;
    age = name && name.part === "name" ? name.statedAge : 0;
  } else {
    docScore = id.docScore;
    if (id.kind === "invented") {
      registry = "not_found";
      age = name && name.part === "name" ? name.statedAge : 0;
    } else if (name && name.part === "name") {
      registry = name.close ? "partial" : "mismatch";
      age = name.statedAge;
    } else {
      // A borrowed number with no made-up name: the applicant is the owner.
      registry = "match";
      age = id.ownerAge ?? 30;
    }
  }

  let fileAgeMonths = 0;
  let authorizedUserOnly = false;
  let phoneAgeDays: number = ORDINARY.phoneAgeDays;
  let emailAgeDays: number = ORDINARY.emailAgeDays;
  let deviceIds24h: number = ORDINARY.deviceIds24h;
  let addressIds30d: number = ORDINARY.addressIds30d;
  let addressType: string = ORDINARY.addressType;
  let ipType: string = ORDINARY.ipType;
  let fillSeconds: number = ORDINARY.fillSeconds;

  for (const s of stitches) {
    switch (s.part) {
      case "phone":
        phoneAgeDays = s.ageDays;
        break;
      case "email":
        emailAgeDays = s.ageDays;
        break;
      case "device":
        deviceIds24h = s.idsInWindow;
        break;
      case "address":
        addressType = s.addressType;
        addressIds30d = s.idsInWindow;
        break;
      case "network":
        ipType = s.ipType;
        break;
      case "file":
        fileAgeMonths = s.ageMonths;
        authorizedUserOnly = s.authorizedUserOnly;
        break;
      case "speed":
        fillSeconds = s.fillSeconds;
        break;
      default:
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

/** Which signals does this stitch change? Used to find the blind spot. */
export function signalsChangedByStitch(stitch: IgorStitch): string[] {
  switch (stitch.part) {
    case "idNumber":
      return ["registry", "docScore"];
    case "name":
      return ["age", "registry"];
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
