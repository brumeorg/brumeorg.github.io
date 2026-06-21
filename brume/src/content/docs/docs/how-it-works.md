---
title: How Brume works
description: The mental model — extraction, transformation, write. Determinism, secrets, FK traversal.
---

Brume is a CLI that copies a **subset** of a source PostgreSQL database to a target (another Postgres instance or a `.sql` file), **transforming personal data on the fly** while preserving referential integrity.

## The pipeline

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   SOURCE     │───▶│  TRANSFORM      │───▶│   TARGET     │
│  Postgres    │    │  per column     │    │  Postgres    │
│  (read-only) │    │  (deterministic)│    │   or .sql    │
└──────────────┘    └─────────────────┘    └──────────────┘
        │                    │                     │
   FK traversal       hmac-secret + fpe-key   FK preserved
   row filters        per-column strategy     no triggers off
```

Three phases:

1. **Extract** — walk the schema starting from the tables in `extraction.tables`, follow foreign keys up to `fk_depth` levels (parents and children), apply any `filter` clauses.
2. **Transform** — for each row, apply the per-column strategy declared in `anonymization.tables[].columns`. Undeclared columns are copied as-is (`KEEP`).
3. **Write** — push to the target database or to a portable `.sql` file.

## Strategy vs Type

Two concepts you'll see everywhere:

| | What it controls | Where it lives |
|---|---|---|
| **Strategy** | *How* the value is transformed (`FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `KEEP`) | Required on every declared column |
| **Type** | *What kind of value* to produce (`EMAIL`, `PHONE`, `IBAN`, …) | Required only for `FAKE` and `MASK` |

A column is configured as a `(strategy, type?)` pair. See [strategies](/docs/strategies/) and [semantic types](/docs/semantic-types/) for the full picture.

## Determinism — the core property

Every transformation is **keyed by your secrets** (`hmac-secret` and `fpe-key`) and **deterministic**:

> Same input + same secret = same output, **every time**.

This is what makes Brume usable in real workflows:

- **Stable tests** — your test fixtures don't change between runs.
- **Joinable datasets** — a `HASH`-ed email in two tables hashes to the same value, so joins still work.
- **Reproducible debug sessions** — a bug you reproduced yesterday on `users.id = FPE_ID(42) = 7831` is still at `7831` tomorrow.

Determinism is what differentiates a pseudonymization from a random-noise anonymizer.

## Foreign keys are preserved automatically

When you declare `id` of `users` as `FPE_ID`, Brume detects every foreign key that points to `users.id` (e.g. `orders.user_id`) and rewrites it with the **same encryption**. The result: FK constraints on the target hold without disabling triggers.

For values that should match across tables that aren't joined by a formal FK (e.g. an `email` shared between `users.email` and `audit_logs.user_email`), use [`linked_columns`](/docs/configuration/#linked-columns).

## Secrets — the additional information

GDPR Article 4.5 defines pseudonymization as processing such that the data can no longer be attributed to a specific person **without the use of additional information kept separately**. In Brume, that "additional information" is exactly:

- `BRUME_HMAC_SECRET` — seeds `FAKE`, `HASH`, and `linked_columns`.
- `BRUME_FPE_KEY` — keys the format-preserving encryption used by `FPE_ID` and `FPE_UUID`.

**Protect these at the same level as the source data.** Their leak is not "just a config leak" — it invalidates the pseudonymization itself.

## Outputs

Brume can write to two kinds of target:

- **Another PostgreSQL database** — fastest path, ideal for `dev` / `staging` / debug environments.
- **A `.sql` file** — portable, shippable, importable with `psql`. Useful for CI artifacts or DPO review.

The choice is configured in `.env` — see the [`.env` reference](/docs/env/).

## Next

- [**Pseudonymization strategies**](/docs/strategies/) — what each strategy produces and when to use it.
- [**Semantic types**](/docs/semantic-types/) — the values `FAKE` and `MASK` can generate.
- [**`brume.yml` reference**](/docs/configuration/) — every key, every option.
