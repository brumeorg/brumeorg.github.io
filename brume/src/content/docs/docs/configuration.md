---
title: brume.yml reference
description: The full schema of the brume.yml configuration file — extraction, anonymization, linked_columns, JSONB paths.
---

`brume.yml` is the single declarative file that describes **what** to extract and **how** to transform it. It lives next to your `.env` and is loaded automatically by every Brume subcommand.

## Top-level structure

```yaml
extraction:        # what to copy from the source
  fk_depth: 3
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

Maximum number of foreign-key levels Brume traverses automatically — both **parents** (the row a FK points to) and **children** (rows that point to the current row).

```yaml
extraction:
  fk_depth: 3
```

Higher values produce a more complete subset but extract more rows. Typical values: `2–4`.

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
| `table` | yes | Table name (qualified with schema if not `public`, e.g. `analytics.events`) |
| `filter` | no | Raw SQL `WHERE` clause applied to this table only |

The `filter` is injected as-is into the extraction query — it must be **valid SQL** for your Postgres version. Quote literals correctly.

## `anonymization`

Controls **how** each column is transformed.

### `anonymization.linked_columns`

Declares that several columns across different tables represent **the same semantic value** and must produce **the same fake output** — even when they aren't joined by a formal foreign key.

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

One of: `FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `KEEP`. See [strategies](/docs/strategies/).

#### `columns[].type`

Required when `strategy` is `FAKE` or `MASK`. One of: `EMAIL`, `FIRST_NAME`, `LAST_NAME`, `PHONE`, `IBAN`, `ADDRESS`, `IP_ADDRESS`, `JSONB`. See [semantic types](/docs/semantic-types/).

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
- A `type: JSONB` without `json_paths`.
- A table referenced in `anonymization.tables` that isn't reachable from `extraction.tables` (you'd be transforming nothing).
- A `linked_columns` entry referencing a column also declared with a different strategy.

Run [`brume dry-run`](/docs/cli/#brume-dry-run) to catch all of these without touching the target.

## Full example

```yaml
extraction:
  fk_depth: 3
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
- [**`.env` variables**](/docs/env/) — connections and secrets.
