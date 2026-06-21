---
title: GDPR & compliance
description: Brume's legal position, GDPR articles it implements or supports, and the DPO sign-off checklist.
---

This page is the canonical reference to share with your **DPO**, **legal counsel**, or **security team** before any production rollout.

## Legal position

Brume produces a **pseudonymization within the meaning of GDPR Article 4.5**.

It is **not** anonymization within the meaning of Recital 26. The target dataset **remains personal data** under the GDPR and must continue to be processed under a valid legal basis, with appropriate technical and organizational measures.

> *"Pseudonymisation"* means the processing of personal data in such a way that the personal data can no longer be attributed to a specific data subject **without the use of additional information**, provided that such additional information is kept separately and is subject to technical and organisational measures to ensure that the personal data are not attributed to an identified or identifiable natural person.
> — **GDPR Art. 4.5**

In Brume, the *additional information* is precisely the pair `BRUME_HMAC_SECRET` + `BRUME_FPE_KEY`.

## GDPR articles covered

| Article | Title | What Brume provides | What stays your responsibility |
|---|---|---|---|
| **Art. 4.5** | Definition of pseudonymization | Implements the definition through `FAKE`, `HASH`, `FPE_ID`, `FPE_UUID`, `MASK`, `NULLIFY`. | Keeping the secrets *kept separately* and protected. |
| **Art. 5.1(c)** | Data minimization | Row-level filters + automatic FK traversal scoped to the data you actually need. | Choosing the right filters and reviewing `brume plan` output. |
| **Art. 25** | Data protection by design and by default | Declarative `brume.yml` enables explicit, version-controllable, DPO-reviewable rules per column. | Including the DPO in the review loop before any run. |
| **Art. 32** | Security of processing | Deterministic, keyed transformations; supports TLS to source and target. | Operating the system securely (transport, storage, access). |
| **Art. 89** | Safeguards for research / statistics / archiving | Pseudonymization is the canonical safeguard recommended by Art. 89.1. | Documenting the purpose of the processing in your records. |

## What Brume does *not* do

Be honest about the boundary — your DPO will appreciate it:

- Brume **does not anonymize**. The output is reversible with the secrets.
- Brume **does not classify** which columns are PII. You declare them in `brume.yml`. `brume plan` proposes a heuristic list but it is not exhaustive.
- Brume **does not generate** your records of processing (Art. 30) or your DPIA (Art. 35). It produces the pseudonymized dataset that supports them.
- Brume **does not enforce** access control on the target. Restrict the recipients with your usual database role management.

## DPO checklist

Before running Brume on production data:

- **Secrets** are stored in your secret manager (Vault, SOPS, AWS Secrets Manager, GitHub Encrypted Secrets…), not in plaintext on disk or in git.
- **Source** is accessed with a read-only account.
- **`brume.yml`** is in version control and has gone through code review.
- **`brume plan`** has been run and its list of uncovered PII columns has been reviewed.
- **`brume dry-run`** completes with zero errors.
- **`brume audit --anonymity`** has been run on the resulting dataset — see [k-Anonymity audit](/docs/k-anonymity/).
- **Recipients** of the pseudonymized dataset are limited to the strict minimum (dev, QA, demo).
- **The dataset is not labelled "anonymous"** in any internal documentation or external communication.
- **A retention period** is set on the pseudonymized copy.
- **Logs** from the run are archived (use `--json` to ingest them in your SIEM).

## Recommended practices

- **Rotate `BRUME_HMAC_SECRET` and `BRUME_FPE_KEY` on a schedule** — and treat the rotation as a coordinated cutover, because it invalidates the determinism of past outputs.
- **Run Brume in a dedicated network segment** with explicit egress to the source and target only.
- **Document the purpose** of each run in your records of processing — Art. 30 expects it.

## Citing Brume in your records of processing

Suggested wording (adapt to your situation):

> Pseudonymization of personal data for use in non-production environments is performed using Brume (v\<X.Y.Z\>), implementing the definition of pseudonymization under GDPR Article 4.5. The additional information enabling re-identification (`BRUME_HMAC_SECRET`, `BRUME_FPE_KEY`) is stored in `<your secret manager>` and access-restricted to `<role name>`. The target dataset is treated as personal data and is subject to the same technical and organizational measures as the source.

## Next

- [**k-Anonymity audit**](/docs/k-anonymity/) — measure residual re-identification risk.
- [**Operations & troubleshooting**](/docs/operations/) — secret management, logging, access control.
