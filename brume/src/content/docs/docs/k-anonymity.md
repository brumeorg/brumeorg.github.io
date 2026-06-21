---
title: k-Anonymity audit
description: Measure the residual re-identification risk on a pseudonymized dataset, and produce a DPO-ready report.
---

Pseudonymization replaces direct identifiers (name, email, ID). But a row can still be re-identifiable through a **combination of indirect attributes** — birth date + ZIP code + gender, for instance. The `brume audit --anonymity` subcommand measures that residual risk.

## What is k-anonymity?

A dataset is **k-anonymous** with respect to a set of *quasi-identifiers* if every combination of those values appears in **at least `k` rows**.

Introduced by [Sweeney (2002)](https://epic.org/wp-content/uploads/privacy/reidentification/Sweeney_Article.pdf), the metric captures one specific risk: if your row is unique on `(birth_date, zip_code, gender)`, anyone who knows those three values about you can pick you out of the dataset — even if your name has been replaced.

## Quasi-identifiers

A **quasi-identifier** is a column whose value isn't a direct identifier on its own, but contributes to identifying you when combined with others.

Common examples:

- Demographic: `birth_date`, `gender`, `nationality`, `zip_code`, `city`
- Behavioral: `subscription_plan` + `created_at` + `last_login_at`
- Geographic: `lat`/`lng` rounded coordinates

You declare them per table when you run the audit.

## Singleton classes

A **singleton class** is a combination of quasi-identifier values that appears in **exactly one row**. Singletons are the most re-identifiable rows in your dataset — the ones the audit highlights first.

`k = 1` means at least one singleton exists. Common targets: `k ≥ 5` (light protection) up to `k ≥ 50` (high protection for sensitive datasets).

## Running the audit

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --report-format markdown
```

Multiple tables can be audited in one run by repeating `--quasi-id`:

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --quasi-id "patients:age_bucket,city,blood_type" \
  --report-out audit-2026-q2.md
```

## Reading the report

The report has three sections:

1. **Summary** — `k_min`, number of singletons, percentage of rows in equivalence classes below threshold.
2. **Top exposed combinations** — the smallest classes, sorted by `k` ascending.
3. **Recommendations** — concrete suggestions: generalize this column (`birth_date` → `birth_year`), suppress that one, or change its strategy in `brume.yml`.

The report is designed to be handed to your DPO **as-is** for decision support.

## What the audit is *not*

The audit measures k-anonymity only. It does not measure:

- **`l`-diversity** — whether sensitive attributes are diverse within each equivalence class.
- **`t`-closeness** — whether the distribution of sensitive attributes inside a class matches the global distribution.
- **Cross-table risk** — re-identification through joins between two of your tables.

These are roadmap items. For now, k-anonymity gives you the single most useful number to discuss with your DPO.

## In CI/CD

The audit exits with **code `3`** if a threshold is breached, so you can gate runs:

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --min-k 5 \
  --report-out artifacts/k-anonymity.md
```

Use this to keep staging refreshes within an acceptable risk envelope.

## Next

- [**GDPR & compliance**](/docs/gdpr/) — overall sign-off checklist.
- [**Strategies**](/docs/strategies/) — adjust per-column transformations to raise `k`.
