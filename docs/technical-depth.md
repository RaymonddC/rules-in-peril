# RIP: technical depth

How RIP works, why it is built this way, and how it lines up with the public guidance of the organizations that set the rules for identity proofing, AI-agent security and model testing.

Every number about the engine below comes from this repository: seed 1818, 880 villagers, 120 monsters, `rules/starter-fintech.json`. Re-run it with `npm run report`. Sources are linked where they are used and collected at the end. Their content was paraphrased, not copied.

## 1. The problem, from the institutions that track it

**Synthetic identities.** The Federal Reserve defines synthetic identity fraud as combining personal information to fabricate a person or entity for financial gain ([Federal Reserve, Payments Improvement](https://fedpaymentsimprovement.org/strategic-initiatives/payments-security/synthetic-identity-payments-fraud/)). It built a mitigation toolkit for the industry, and its press release estimated about $20 billion in losses to US financial institutions in 2020 ([Federal Reserve press release](https://fedpaymentsimprovement.org/news/press-releases/federal-reserve-releases-synthetic-identity-fraud-mitigation-toolkit-to-educate-fight-fraud/)). The Boston Fed reported that losses passed $35 billion in 2023, citing FiVerity ([Boston Fed, April 2025](https://www.bostonfed.org/news-and-events/news/2025/04/synthetic-identity-fraud-financial-fraud-expanding-because-of-generative-artificial-intelligence.aspx)). The Fed's toolkit also notes why the loss is hard to see: a synthetic identity behaves like a good customer, then stops paying, and the loss is booked as ordinary credit loss ([Toolkit, module 8](https://fedpaymentsimprovement.org/resources/synthetic-identity-fraud-mitigation-toolkit/fraud-data-strategy-and-information-sharing/)). Each source measures something different, so the figures are not added together.

**Why a child's number.** A Carnegie Mellon CyLab study by Richard Power scanned the identities of over 40,000 US children. It found about 10% had someone else using their identification number, a rate 51 times that of adults in the same population ([CyLab, 2011](http://www.cyblog.cylab.cmu.edu/2011/03/child-identity-theft.html)). A child's number has no credit history and nobody checks it for years. That is the pattern Igor's demo monster uses, in a fictional country with a fictional ID format (see `synthetic-only.md`).

**AI agents.** OWASP's Top 10 for LLM Applications lists Excessive Agency: an AI system takes damaging actions because it has more functionality, permission or autonomy than its task needs. The 2026 edition moved it from sixth to third place (LLM03), the biggest move in the list ([OWASP GenAI project](https://genai.owasp.org); summary of the change: [Check Point](https://blog.checkpoint.com/ai-security/reading-the-signals-in-the-owasp-llm-top-10-2026/)). MITRE ATLAS, MITRE's knowledge base of attacks on AI systems, added agent-focused techniques in 2025 ([MITRE ATLAS](https://atlas.mitre.org)).

## 2. How each app maps to the guidance

### Igor and NIST SP 800-63A-4

NIST's identity-proofing guideline has three steps ([NIST SP 800-63A-4, final](https://csrc.nist.gov/pubs/sp/800/63/a/4/final); [proofing section](https://pages.nist.gov/800-63-4/sp800-63a/proofing/)):

| NIST step | What it checks | Igor signal | Starter pack |
|---|---|---|---|
| Resolution | Collect evidence and core attributes, find a unique real person | `deviceIds24h`, `addressIds30d` | `busy-device` |
| Validation | Evidence is authentic, and the core attributes (name, birth date, ID) match an authoritative source | `docScore` (the document), `registry` (the attributes) | `low-doc-score` only |
| Verification | The applicant is the real owner of the evidence | not modelled | none |

The starter pack validates the document but never checks the attributes against the authoritative source. RIP finds that gap without being told: monster #17 walks with a real-looking document and a name and birth date that the registry disagrees with. In the US, the Social Security Administration's eCBSV service does this attribute check. It tells a permitted entity whether a number, name and date of birth match SSA's records ([SSA eCBSV](https://www.ssa.gov/dataexchange/eCBSV/)). Igor's `registry` signal is a fictional stand-in for that kind of check. It is not a model of SSA or any vendor.

NIST also describes trusted referees, who handle applicants whose attributes do not all match for honest reasons, such as a recent name change. That is the difference between fix A and fix B below: reject on a registry mismatch, or send it to a person.

### Salt Circle and split transactions

Salt Circle's breach, four $499 refunds where one $2,000 refund is blocked, is the agent version of structuring. In banking, deliberately splitting a transaction to stay under a reporting threshold is itself a federal offence in the US ([31 U.S.C. § 5324](https://www.law.cornell.edu/uscode/text/31/5324)), and detection works by adding amounts up across transactions. A guardrail that checks each agent action on its own repeats the mistake that anti-money-laundering teams learned to avoid. RIP shows it in one run: `amount > 500` is checked, and `runningTotal` is the blind spot.

## 3. The method and where it comes from

RIP applies two well-known testing techniques to business rules instead of code.

**Property-based testing.** QuickCheck introduced the idea of stating a property and testing it on many generated inputs ([Claessen and Hughes, ICFP 2000](https://dl.acm.org/doi/10.1145/351240.351266)). fast-check brings it to TypeScript, with seeded replay and shrinking ([fast-check](https://fast-check.dev/)). RIP uses fast-check to test its own engine. It applies the same idea to the user's rules: the property is "no monster walks", and the generated inputs are a seeded world.

**Delta debugging.** Zeller and Hildebrandt's algorithm reduces a failing input until every remaining part is needed to reproduce the failure. They call that result 1-minimal ([Zeller and Hildebrandt, IEEE TSE 2002](https://dl.acm.org/doi/10.1109/32.988498)). RIP's shrink works the same way, with "the monster still walks" as the failure.

### The shrink algorithm (`packages/core/src/shrink`)

1. Start with all of the monster's stitches.
2. Try removing each stitch, left to right. Rebuild the records with `world.records(remaining)`. If every record is approved and `world.harmDone(records)` is still true, keep the removal and start the scan again.
3. Stop when a full pass removes nothing.

Properties, each covered by a test in `shrink.prop.test.ts`:
- **Never adds.** The result never has more stitches than the original. The code only removes; the test checks the count, not that each stitch is unchanged.
- **Keeps walking.** The result still walks.
- **1-minimal.** Removing any one remaining stitch stops the walk. This is a local minimum, so screens say "the smallest found by the search", never "the smallest".
- **Deterministic.** Same monster and same rules give the same result.

Cost: at most n removals, each needing a scan of up to n candidates, so O(n²) world rebuilds and rule checks. Igor monsters have 9 stitches, so that is at most 81 checks. Zeller's ddmin removes chunks first, which pays off for inputs with thousands of parts. Stitches are few, so the simpler one-at-a-time scan was chosen.

### What makes shrinking meaningful: defined absence

Shrinking only shows something if removing a stitch has a defined effect. In Igor:
- No ID number: no document to score (`docScore` 0) and nothing to look up (`registry` not_found).
- No made-up name with a borrowed number: the applicant applies as the number's real owner, so the registry matches and the age is the owner's.
- Any other part removed: an ordinary value, the kind most honest applicants show.

The world also defines harm. An applicant whose details match the registry is the real owner and does no harm, so a monster only walks while it applies as someone it is not.

### Determinism and label blindness

- One seed drives a mulberry32 generator in `packages/core/src/world/generate.ts`. Nothing reads the clock, `Math.random()` or the locale. Reports carry no timestamps or paths, so the same seed and rules give a byte-identical `reports/latest.md`.
- The rule engine's types only see `{ id, signals }`. A member's truth label (villager or monster) is outside that object, and `parseRules` rejects any rule that names a signal the world doesn't offer. A rule cannot read who is honest. Property 4 in `rules.prop.test.ts` tests this.

## 4. Measured results, seed 1818

Starter pack, 880 villagers and 120 monsters:

| | Count |
|---|---|
| Monsters that walk | 46 of 120 |
| Monsters caught | 74 |
| Villagers rejected | 5 (0.6%) |
| Villagers sent to review | 47 (5.3%) |
| Walkers whose shrink ends at 2 stitches | 46 of 46 |

Three fixes, each placed as a new rule on top and re-run on the same world:

| Fix | Rule | Monsters that walk | Villagers rejected in all | Villagers in review in all |
|---|---|---|---|---|
| A | `registry != match` → reject | 0 | 87 (9.9%) | 42 |
| B | `registry != match` → review | 0 | 4 (0.5%) | 125 (14.2%) |
| C | `fileAgeMonths = 0` → reject | 29 | 57 (6.5%) | 46 |

Fix A closes the gap but breaks the product promise of at most 1% of villagers rejected. Fix B closes it and keeps the promise, at the price of 78 more people waiting for a human. Fix C is the usual reflex, and it costs the most while leaving 29 monsters walking. Choosing between these is the decision RIP is built to inform.

Pricing cost: each fix re-runs the full world, so pricing is fixes × members × rules rule checks. That is 3 × 1,000 × 8 here, which runs in milliseconds in a browser.

## 5. Testing and model governance

Banks often govern decision rules under model risk management, though each institution decides what counts as a model. On 17 April 2026 the Federal Reserve, OCC and FDIC replaced SR 11-7 with SR 26-2, revised guidance that keeps development, validation and ongoing monitoring at its core ([Federal Reserve SR 26-2](https://www.federalreserve.gov/supervisionreg/srletters/SR2602.pdf); summary: [Deloitte](https://www.deloitte.com/content/dam/assets-zone3/us/en/docs/services/consulting/2026/us-deloitte-banking-regulators-issue-revised-model-risk-management-supervisory-guidance-april-2026.pdf)). For AI systems, NIST's Generative AI Profile recommends structured red-teaming to find flaws before and after deployment ([NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)).

RIP supports that kind of testing. It does not replace it:
- **Repeatable.** A seed reproduces a report exactly, which an auditor can check.
- **Before release.** It runs on a rule change, before the rule ships.
- **Regression.** Caught monsters are kept in the crypt and re-run, so a gap that was closed stays closed. *(The crypt format and the CLI's exit 1 on a walk are still being built.)*

## 6. Limits, stated plainly

- The signals are a generic model, not any vendor's data, and the worlds are synthetic. A walk in RIP shows a gap in the rule logic, not a measured loss rate.
- "Smallest" is a local minimum from a greedy search, not a proof.
- Fix prices depend on the villager population the world generates. A team would tune that population to its own applicant mix.
- RIP tests only the rules a user loads. It does not connect to, probe or describe any real system.

## Sources

- Federal Reserve, Synthetic identity fraud: https://fedpaymentsimprovement.org/strategic-initiatives/payments-security/synthetic-identity-payments-fraud/
- Federal Reserve, toolkit press release: https://fedpaymentsimprovement.org/news/press-releases/federal-reserve-releases-synthetic-identity-fraud-mitigation-toolkit-to-educate-fight-fraud/
- Federal Reserve, toolkit module 8: https://fedpaymentsimprovement.org/resources/synthetic-identity-fraud-mitigation-toolkit/fraud-data-strategy-and-information-sharing/
- Federal Reserve Bank of Boston, April 2025: https://www.bostonfed.org/news-and-events/news/2025/04/synthetic-identity-fraud-financial-fraud-expanding-because-of-generative-artificial-intelligence.aspx
- Carnegie Mellon CyLab, Child identity theft (2011): http://www.cyblog.cylab.cmu.edu/2011/03/child-identity-theft.html
- NIST SP 800-63A-4: https://csrc.nist.gov/pubs/sp/800/63/a/4/final and https://pages.nist.gov/800-63-4/sp800-63a/proofing/
- Social Security Administration, eCBSV: https://www.ssa.gov/dataexchange/eCBSV/
- OWASP Top 10 for LLM Applications: https://genai.owasp.org
- Check Point, OWASP LLM Top 10 2026 summary: https://blog.checkpoint.com/ai-security/reading-the-signals-in-the-owasp-llm-top-10-2026/
- MITRE ATLAS: https://atlas.mitre.org
- 31 U.S.C. § 5324 (structuring): https://www.law.cornell.edu/uscode/text/31/5324
- Claessen and Hughes, QuickCheck (ICFP 2000): https://dl.acm.org/doi/10.1145/351240.351266
- Zeller and Hildebrandt, Simplifying and Isolating Failure-Inducing Input (IEEE TSE 2002): https://dl.acm.org/doi/10.1109/32.988498
- fast-check: https://fast-check.dev/
- Federal Reserve SR 26-2 (April 2026): https://www.federalreserve.gov/supervisionreg/srletters/SR2602.pdf
- NIST AI 600-1, Generative AI Profile: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
