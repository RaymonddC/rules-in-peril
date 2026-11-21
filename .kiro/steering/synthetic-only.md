---
inclusion: always
---

# Synthetic only

RIP runs on invented data. This holds for code, fixtures, tests, rule packs, the crypt, reports, screenshots, the README and the demo video.

## Rules

1. No real personal data, from any source, for any reason. Not as a sample, not as a test fixture, not pasted from a log.
2. Igor's people live in Vesper, a fictional country. Names, towns, addresses, phone numbers and ID numbers are invented for Vesper. Do not use the names of real public figures.
3. No real ID formats. An ID number must not have the length, grouping or checksum of any real identifier, for example a US SSN, an Indonesian NIK or a UK National Insurance number.
4. No real companies, banks, KYC vendors or agent products, and none of their logos or trademarks. Salt Circle's customers, orders and refunds are invented.
5. The signals are a generic model, not any vendor's data or scoring. The README says so.
6. A rules file loaded by a user is theirs. It stays in the browser tab: never uploaded, never logged, never stored anywhere else (R1).
7. RIP tests only the rules a user loads. Describe a monster only in terms of the signal model: which signals it shows and which signal no rule reads. Do not write steps for defeating a real system, for forging a real document, or anything that names a real vendor's check.

## Raw values

Rules read signals such as `phoneAgeDays`, not the phone number itself. Do not generate a raw value unless a screen has to show it. When one has to be shown, use these forms and no others:

| Value | Form | Example |
|---|---|---|
| Vesper ID number | `VSP-` plus four letters and four digits | `VSP-QMRA-0427` |
| Email address | A name at a `.example` domain | `mara.voss@post.vesper.example` |
| Phone number | `V` plus seven digits in two groups | `V 555 0142` |
| IP address | Not shown. Show `ipType` instead | `datacenter` |

## When in doubt

If a task seems to need real data, a real format or a real company name, stop and ask.
