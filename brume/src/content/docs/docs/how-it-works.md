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

1. **Extract** — start from the rows selected by `extraction.tables` and their `filter` clauses, then copy every row within `fk_depth` foreign-key hops of them, towards parents and children (plus, by default, every parent those rows need — see [`orphan_policy`](/docs/configuration/#extractionorphan_policy)).
2. **Transform** — for each row, apply the per-column strategy declared in `anonymization.tables[].columns`. Undeclared columns are copied as-is (`KEEP`).
3. **Write** — push to the target database or to a portable `.sql` file. A row whose pseudonymized value would break a `UNIQUE` constraint is not written, and reported (see [UNIQUE columns and collisions](/docs/strategies/#unique-columns-and-collisions)).

## Strategy vs Type

Two concepts you'll see everywhere:

| | What it controls | Where it lives |
|---|---|---|
| **Strategy** | *How* the value is transformed (`FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `DATE_SHIFT`, `KEEP`) | Required on every declared column |
| **Type** | *What kind of value* to produce (`EMAIL`, `PHONE`, `IBAN`, …) | Required only for `FAKE` and `MASK` |

A column is configured as a `(strategy, type?)` pair. See [strategies](/docs/strategies/) and [semantic types](/docs/semantic-types/) for the full picture.

## Determinism — the core property

Every transformation is **keyed by your secrets** (`hmac-secret` and `fpe-key`) and **deterministic**:

> Same input + same secret = same output, **every time**.

This is what makes Brume usable in real workflows:

- **Stable tests** — your test fixtures don't change between runs.
- **Joinable datasets** — a `HASH`-ed email in two tables hashes to the same value, so joins still work.
- **Reproducible debug sessions** — a bug you reproduced yesterday on `users.id = FPE_ID(42) = 7831` is still at `7831` tomorrow.

Determinism is what differentiates a pseudonymization from a random-noise anonymizer. It does not mean collision-free: two different values can get the same fake one — see [UNIQUE columns and collisions](/docs/strategies/#unique-columns-and-collisions).

## Determinism and versions

The determinism holds **across all releases of the same major version**: Brume 2.0, 2.1, 2.2… give the same output for the same input, secrets and locale. Reference outputs are pinned in Brume's test suite, and changing one requires a new major version.

**2.0** changes some outputs compared with 1.x:

- `FAKE` + `PHONE`: the format is kept, the digits are now drawn from the HMAC seed (1.6 % of values collided before).
- `FAKE` first names, last names and addresses on a `UNIQUE` column carry a uniqueness suffix.
- `.sql` dumps: timestamps are written with their UTC offset. A `timestamptz` value restores to the right instant whatever the time zone of the restoring session — it used to be shifted by the time-zone difference between the machine running Brume and the server.

When upgrading from 1.x, pseudonymize again every database you need to join or compare: the values above change once.

## Foreign keys are preserved automatically

When you declare `id` of `users` as `FPE_ID`, Brume detects every foreign key that points to `users.id` (e.g. `orders.user_id`) and rewrites it with the **same encryption**. The result: FK constraints on the target hold without disabling triggers. The same goes for `HASH` and `FAKE`, and whatever end of the foreign key you declare the rule on — a `FAKE EMAIL` on `customers.email` also applies to `orders.customer_email` if a foreign key links them.

For values that should match across tables that aren't joined by a formal FK (e.g. an `email` shared between `users.email` and `audit_logs.user_email`), use [`linked_columns`](/docs/configuration/#anonymizationlinked_columns).

## Secrets — the additional information

GDPR Article 4.5 defines pseudonymization as processing such that the data can no longer be attributed to a specific person **without the use of additional information kept separately**. In Brume, that "additional information" is exactly:

- `BRUME_HMAC_SECRET` — seeds `FAKE`, `HASH`, and `linked_columns`.
- `BRUME_FPE_KEY` — keys the format-preserving encryption used by `FPE_ID` and `FPE_UUID`.

**Protect these at the same level as the source data.** Their leak is not "just a config leak" — it invalidates the pseudonymization itself.

## Outputs

Brume can write to two kinds of target:

- **Another PostgreSQL database** — fastest path, ideal for `dev` / `staging` / debug environments.
- **A `.sql` file** — portable, shippable, importable with `psql`. Useful for CI artifacts or DPO review.

The sink type is picked at scaffold time with `brume init dump` or `brume init jdbc`, then tuned in `.env.brume` — see the [`.env.brume` reference](/docs/env/).

## Next

- [**Pseudonymization strategies**](/docs/strategies/) — what each strategy produces and when to use it.
- [**Semantic types**](/docs/semantic-types/) — the values `FAKE` and `MASK` can generate.
- [**`brume.yml` reference**](/docs/configuration/) — every key, every option.
