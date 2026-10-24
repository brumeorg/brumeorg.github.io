---
title: Pseudonymization strategies
description: The eight strategies Brume can apply per column — FAKE, MASK, HASH, NULLIFY, FPE_ID, FPE_UUID, DATE_SHIFT, KEEP — and how they behave on UNIQUE columns.
---

A **strategy** defines *how a real value is transformed* before being written to the target. It is declared at the column level in `brume.yml`.

## At a glance

| Strategy | Reversible? | Joinable? | Format-preserving? | Collision-free? | Requires `type` |
|---|---|---|---|---|---|
| [`FAKE`](#fake) | No | Yes (deterministic) | No | Suffixed on `UNIQUE` columns — see [below](#unique-columns-and-collisions) | **Yes** |
| [`MASK`](#mask) | No | No | Yes | No | **Yes** |
| [`HASH`](#hash) | No | Yes | No (fixed 64 chars) | Yes | No |
| [`NULLIFY`](#nullify) | N/A | No | N/A | N/A | No |
| [`FPE_ID`](#fpe_id) | Yes (with key) | Yes | Integer → integer (length changes) | Yes | No |
| [`FPE_UUID`](#fpe_uuid) | Yes (with key) | Yes | Yes (UUID → UUID) | Yes | No |
| [`DATE_SHIFT`](#date_shift) | No | Yes (deterministic) | Yes | No | No |
| [`KEEP`](#keep) | N/A | N/A | N/A | N/A | No |

## `FAKE`

Replaces the value with a **realistic synthetic value** generated via Datafaker, seeded by HMAC of the original. Deterministic: the same source value always produces the same fake.

```yaml
- name: email
  strategy: FAKE
  type: EMAIL
```

**Synthetic dates — `FAKE` + `type: DATE`.** There is no separate `FAKE_DATE` strategy: `FAKE` with `type: DATE` draws a deterministic date, by default a plausible adult birth date between 1935 and 2008. Override the range per column — both bounds together, in `[1900, 2100]`:

```yaml
- name: child_birthday
  strategy: FAKE
  type: DATE
  min_year: 2008    # inclusive
  max_year: 2026    # exclusive
```

The real date is replaced, not perturbed: to keep the distribution of the real dates, use [`DATE_SHIFT`](#date_shift) instead. `brume plan` refuses `FAKE` + `DATE` on a `UNIQUE` column.

On a column that is unique on its own, `FIRST_NAME`, `LAST_NAME` and `ADDRESS` fakes carry a uniqueness suffix (`Darrell.9f3ac21b04e7d5a6`) — see [UNIQUE columns and collisions](#unique-columns-and-collisions).

**Use it for** display-grade PII that needs to look real in screenshots, demos, integration tests where downstream code parses the value (e.g. email validation).

## `MASK`

**Partial masking** that preserves the field's structure. Keeps a prefix or suffix depending on the type, replaces the rest with `*`.

```yaml
- name: phone
  strategy: MASK
  type: PHONE
```

Two masked values easily come out identical: `brume plan` refuses `MASK` on a `UNIQUE` column.

**Use it for** support / log-readable values where you want operators to recognize the *shape* of the data (last 4 digits of a card, first letters of a name) without seeing the full value.

## `HASH`

One-way **HMAC-SHA256** keyed with `BRUME_HMAC_SECRET`. Produces a 64-character hex string. Deterministic, non-reversible.

```yaml
- name: external_user_id
  strategy: HASH
```

**Use it for** opaque identifiers you need to join on across tables but never need to display or reverse. The output is always 64 chars — if the column has a `VARCHAR(N)` constraint smaller than that, prefer `FPE_ID` or `FPE_UUID`.

## `NULLIFY`

Replaces the value with **`NULL`**. The column must be nullable: `brume plan` refuses `NULLIFY` on a `NOT NULL` column.

```yaml
- name: free_text_notes
  strategy: NULLIFY
```

**Use it for** free-text or comment fields where users might paste PII that no strategy can safely sanitize. The strongest minimization possible.

## `FPE_ID`

**Format-preserving encryption** (FF1 / BouncyCastle) for **non-negative integer identifiers**, keyed by `BRUME_FPE_KEY`. It is a bijection: two different ids never give the same output, so primary keys stay unique.

```yaml
- name: id
  strategy: FPE_ID
```

The output is an integer, but **not of the same length**: FF1 needs a minimum domain size, so small ids come out longer (with a given key, `1` → `12227206`, `12345` → `1977275239`).

| Source id | Output range | Target column |
|---|---|---|
| `0` … `2 147 483 647` | `0` … `2 147 483 647` | fits an `integer` |
| `2 147 483 648` … `999 999 999 999 999 999` | up to 18 digits | needs a `bigint` |
| negative | rejected | — |

Neither the length nor the order of the ids is preserved — don't rely on either.

**Use it for** numeric primary keys. Brume **automatically propagates** the encryption to every foreign key pointing to this PK, so referential integrity holds end-to-end.

## `FPE_UUID`

UUID-to-UUID deterministic pseudonymization. Preserves the `8-4-4-4-12` format, uniqueness, and FK relationships.

```yaml
- name: id
  strategy: FPE_UUID
```

**Use it for** UUID primary keys. Same automatic FK propagation as `FPE_ID`.

## `DATE_SHIFT`

Deterministic signed **day shift** on temporal columns (`date`, `timestamp`, `timestamptz`, `time`, `interval`). The output is the input ± N days, N drawn from `[-max, +max]` via an HMAC of the value. Age cohorts and the order of events within the window are preserved.

```yaml
- name: birth_date
  strategy: DATE_SHIFT
```

The window is set by `brume.date-shift.max-days` (default `30`, env var `BRUME_DATE_SHIFT_MAX_DAYS`). Two different dates can land on the same day: on a `UNIQUE` date column, expect collisions — see [below](#unique-columns-and-collisions).

**Use it for** event dates and birth dates whose distribution matters for analytics. For a fully synthetic birth date, use `FAKE` + `type: DATE` instead.

## `KEEP`

Copies the value **without modification**. This is the **default behavior** for any column not declared in `brume.yml`.

```yaml
- name: country_code
  strategy: KEEP
```

**Use it for** non-sensitive columns (lookups, enums, timestamps) — though usually you just leave them undeclared.

## UNIQUE columns and collisions

Deterministic does not mean collision-free: Datafaker knows about 5,000 first names, so two different real values can get the same fake one. On a `UNIQUE` column, the target would reject the second row. Brume handles this in three ways.

**1. Prevention.** On a column that is unique on its own (primary key, `UNIQUE` constraint or unique index), `FAKE` with `FIRST_NAME`, `LAST_NAME` or `ADDRESS` appends 64 bits derived from the exact real value — `Darrell.9f3ac21b04e7d5a6`, cut to fit `varchar(n)`. Columns that must hold the same value (both sides of a foreign key, [`linked_columns`](/docs/configuration/#anonymizationlinked_columns)) receive the very same suffixed value.

**2. Refusal at `plan`.** `MASK` and `FAKE` + `DATE` on a `UNIQUE` column collide almost surely: `brume plan` rejects them (`CONFIG_SCHEMA_UNIQUE_NOT_INJECTIVE`).

**3. Explicit loss.** A remaining collision **does not stop the run** (exit code `0`). The colliding row is not written, and the loss is reported:

- a `[UNIQUE_COLLISION]` warning in the logs;
- `[WARN] N ligne(s) perdue(s)` with the count per table in the console report;
- an error insight in the plan-vs-actual comparison;
- `uniqueCollisions` per table in the JSON report.

Rows that reference a lost row stay in the target with a dangling foreign key.

With a `.sql` dump as target, rows that would break a unique index are dropped before being written, so the file always restores with `psql`. Unique indexes on an expression (`lower(email)`) or partial ones (`WHERE …`) are not checked.

**Residual collision rates** on a `UNIQUE` column, measured or computed:

| Rule | Collisions |
|---|---|
| `KEEP`, `HASH`, `FPE_ID`, `FPE_UUID` | None |
| `FAKE` `FIRST_NAME` / `LAST_NAME` / `ADDRESS` (suffixed) | ~1 in 37 million for 1 million rows (more on a `varchar` shorter than 12) |
| `FAKE` `EMAIL`, `IBAN` | None out of 200,000 values. Two emails that differ only by case get the same fake email. |
| `FAKE` `PHONE` | 81 (`en`) to 474 (`fr`) per million values |
| `FAKE` `IP_ADDRESS` | ~135 per million values |
| `DATE_SHIFT` | High on dense dates (14 out of 60 consecutive days) |
| Multi-column `UNIQUE` | No suffix — depends on the combination |

For zero collisions on a unique column, use `HASH`, `FPE_ID` or `FPE_UUID`.

## Decision table — which strategy when?

| Your column is… | Pick |
|---|---|
| A numeric PK / FK | `FPE_ID` |
| A UUID PK / FK | `FPE_UUID` |
| An email / name / phone / address you need to display | `FAKE` (+ matching `type`) |
| A phone / card / ID where the *shape* matters but the content doesn't | `MASK` (+ matching `type`) — not on a `UNIQUE` column |
| An opaque key you join on but never display | `HASH` |
| An event or birth date whose distribution matters | `DATE_SHIFT` |
| A free-text comment / notes field | `NULLIFY` |
| A `UNIQUE` column that must keep every row | `HASH`, `FPE_ID` or `FPE_UUID` |
| A safe enum / timestamp / boolean | leave undeclared (= `KEEP`) |

## Next

- [**Semantic types**](/docs/semantic-types/) — the values `FAKE` and `MASK` need.
- [**`brume.yml` reference**](/docs/configuration/) — the full configuration schema.
