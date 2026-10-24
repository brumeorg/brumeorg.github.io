---
title: brume.yml reference
description: The full schema of the brume.yml configuration file — extraction, anonymization, linked_columns, JSONB paths.
---

`brume.yml` is the single declarative file that describes **what** to extract and **how** to transform it. It lives next to your `.env.brume` and is loaded automatically by every Brume subcommand.

## Top-level structure

```yaml
extraction:        # what to copy from the source
  fk_depth: 1
  orphan_policy: KEEP_PARENTS
  tables:
    - table: ...
      filter: ...

anonymization:     # how to transform what's copied
  linked_columns:  # optional, for cross-table consistency
    - semantic_key: ...
      columns: [ ... ]
  tables:
    - table: ...
      columns:
        - name: ...
          strategy: ...
          type: ...        # only for FAKE / MASK
          json_paths: ...  # only for JSONB
```

## `extraction`

Controls **what data** is read from the source.

### `extraction.fk_depth`

A **radius**: a row is copied when it lies at most `fk_depth` foreign-key hops away from a row selected by `extraction.tables`, counting hops towards **parents** (the row a FK points to) and towards **children** (rows that point to it) alike.

```yaml
extraction:
  fk_depth: 1
```

With `orders` filtered on 2025:

| `fk_depth` | Rows copied |
|---|---|
| `1` | the 2025 orders, their `users`, their `order_items` |
| `2` | + the other orders of those users (even outside the filter), the `products` of the items |
| `3` | + the items of those other orders, … |

Each hop can pull many more rows on a real database: **start with `1`** and raise it only when needed. `brume plan` shows the exact row count before anything is written.

### `extraction.orphan_policy`

What happens at the edge of the radius, when a copied row references a row beyond it.

| Value | Behavior |
|---|---|
| `KEEP_PARENTS` (default) | The parents of every copied row are copied too, whatever their distance (upward only — Brume never descends again from them). The target never holds a dangling FK. |
| `ALLOW_ORPHANS` | The radius is strict. References to rows beyond it are kept as-is: the run logs `[ORPHANS] …` per FK and lists them in `orphanReferences` (JSON report). Joins lose those rows, and re-creating the FK constraints on the target fails. |

```yaml
extraction:
  fk_depth: 1
  orphan_policy: ALLOW_ORPHANS
```

### `extraction.tables`

The list of root tables to extract. Brume starts from these and walks FKs.

```yaml
extraction:
  tables:
    - table: orders
      filter: "created_at >= '2025-01-01'"
    - table: order_items
```

Each entry accepts:

| Key | Required | Description |
|---|---|---|
| `table` | yes | Table name in the schema set by `BRUME_SCHEMA`, written exactly as stored (see [Table and column names](#table-and-column-names)) |
| `filter` | no | Raw SQL `WHERE` clause applied to this table only |

The `filter` is injected as-is into the extraction query — it must be **valid SQL** for your Postgres version. Quote literals correctly.

### Table and column names

Write table and column names **exactly as stored in PostgreSQL** — case, accents and spaces included, **without SQL quotes**:

```yaml
- table: fiche client      # stored as "fiche client"
  columns:
    - name: prénom
      strategy: FAKE
      type: FIRST_NAME
    - name: nom de famille
      strategy: FAKE
      type: LAST_NAME
```

Any legal PostgreSQL name is accepted (up to 63 bytes in UTF-8). Brume quotes it in every SQL statement it generates.

### Partitioned tables and views

- A **partitioned table** counts as one table: declare filters and rules on the partitioned table (`payment`), never on its partitions. Brume reads and writes through it and PostgreSQL routes each row to its partition. Foreign keys declared partition by partition are treated as foreign keys of the partitioned table.
- **Views, materialized views and foreign tables** are not tables: they can't be listed in `brume.yml` and `brume scan` ignores them. Their definitions are still recreated on the target by the schema copy.

## `anonymization`

Controls **how** each column is transformed.

### `anonymization.linked_columns`

Declares that several columns across different tables represent **the same semantic value** and must produce **the same fake output** although **no foreign key links them**. Columns linked by a declared foreign key don't need it: the rule of one is applied to the others automatically.

:::note[Changed in 2.1]
Before 2.1, `FAKE` on columns linked by a foreign key was refused unless a `linked_columns` entry covered them. Since 2.1, `FAKE` follows foreign keys on its own, like `FPE_ID`, `FPE_UUID` and `HASH`.
:::

```yaml
anonymization:
  linked_columns:
    - semantic_key: user_email
      columns:
        - table: users
          column: email
        - table: audit_logs
          column: user_email
        - table: subscriptions
          column: notify_email
```

Each entry has:

| Key | Required | Description |
|---|---|---|
| `semantic_key` | yes | Free-form identifier used in logs (e.g. `user_email`, `client_ssn`) |
| `columns[].table` | yes | Table name |
| `columns[].column` | yes | Column name |

All listed columns will receive **the same `FAKE` value** for the same source input.

### `anonymization.tables[]`

Per-table list of column rules.

```yaml
anonymization:
  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID
        - name: email
          strategy: FAKE
          type: EMAIL
```

#### `columns[].name`

The column name to transform.

#### `columns[].strategy`

One of: `FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `DATE_SHIFT`, `KEEP`. See [strategies](/docs/strategies/).

#### `columns[].type`

Required when `strategy` is `FAKE` or `MASK`. One of: `EMAIL`, `FIRST_NAME`, `LAST_NAME`, `PHONE`, `IBAN`, `ADDRESS`, `IP_ADDRESS`, `DATE`, `JSONB`. See [semantic types](/docs/semantic-types/).

#### `columns[].json_paths`

Required when `type` is `JSONB`. List of JSON paths to anonymize inside the document. Other paths are kept as-is.

```yaml
- name: metadata
  strategy: FAKE
  type: JSONB
  json_paths:
    - path: $.contact.email
      type: EMAIL
    - path: $.contact.phone
      type: PHONE
    - path: $.shipping.address
      type: ADDRESS
```

Each path entry accepts:

| Key | Required | Description |
|---|---|---|
| `path` | yes | JSONPath (`$.field.subfield`) |
| `type` | yes | Semantic type to apply at that path |

## Validation rules

Brume validates the configuration at startup and refuses to run on:

- A column with `strategy: FAKE` or `MASK` without a `type`.
- A column with `strategy: NULLIFY` declared on a `NOT NULL` column.
- `MASK`, or `FAKE` with `type: DATE`, on a `UNIQUE` column — their values would collide (see [UNIQUE columns and collisions](/docs/strategies/#unique-columns-and-collisions)).
- `FAKE` declared on several columns linked by a foreign key with a different `type` or different `min_year` / `max_year` — their values would diverge.
- A `type: JSONB` without `json_paths`.
- A table referenced in `anonymization.tables` that isn't reachable from `extraction.tables` (you'd be transforming nothing).
- A `linked_columns` entry referencing a column also declared with a different strategy.

`brume plan` reports these before anything is written. Run [`brume dry-run`](/docs/cli/#brume-dry-run) to exercise the full pipeline without touching the target.

## Full example

```yaml
extraction:
  fk_depth: 1
  tables:
    - table: orders
      filter: "created_at >= '2025-01-01'"
    - table: order_items

anonymization:
  linked_columns:
    - semantic_key: user_email
      columns:
        - table: users
          column: email
        - table: audit_logs
          column: user_email

  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID
        - name: email
          strategy: FAKE
          type: EMAIL
        - name: phone
          strategy: MASK
          type: PHONE
        - name: notes
          strategy: NULLIFY
        - name: metadata
          strategy: FAKE
          type: JSONB
          json_paths:
            - path: $.shipping.address
              type: ADDRESS

    - table: audit_logs
      columns:
        - name: user_email
          strategy: FAKE
          type: EMAIL
        - name: ip
          strategy: MASK
          type: IP_ADDRESS
```

## Next

- [**CLI commands**](/docs/cli/) — how to run `brume plan`, `execute`, `dry-run`.
- [**`.env.brume` variables**](/docs/env/) — connections and secrets.
