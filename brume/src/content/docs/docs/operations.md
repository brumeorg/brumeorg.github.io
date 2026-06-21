---
title: Operations & troubleshooting
description: Performance tuning, secret management, Postgres version compat, common errors and their fixes.
---

This page collects everything you need to run Brume in production-grade conditions: performance, ops, and the most common errors.

## Performance

### Parallelism

`BRUME_PARALLELISM` (default `4`) controls the number of worker threads applied to the transformation stage. Bump it on machines with available cores and fast I/O.

```bash
BRUME_PARALLELISM=12 brume execute
```

Diminishing returns kick in past `2 × physical cores`. Watch your source database — Brume opens one read connection per worker.

### `fk_depth`

Lower `fk_depth` extracts less data. If your bug is reproducible at depth 2, don't pay for depth 4.

A common debug-time pattern:

```bash
BRUME_FK_DEPTH_OVERRIDE=1 brume execute   # smoke run
BRUME_FK_DEPTH_OVERRIDE=3 brume execute   # full run
```

### Memory

Brume streams rows — it does not load tables in memory. The two memory-heavy spots are:

- **JSONB columns with deeply nested `json_paths`** — parsing/serialization happens row-by-row but JVM heap grows with object size.
- **`linked_columns` groups with high cardinality** — the deterministic mapping is cached in memory.

Start with the default JVM heap and increase only if you observe `OutOfMemoryError` in the logs.

## Secret management

### Where to store secrets

In order of preference:

1. **A secret manager** (Vault, AWS Secrets Manager, GCP Secret Manager, SOPS-encrypted file).
2. **CI provider secrets** (GitHub Actions encrypted secrets, GitLab masked variables).
3. **`.env` file in a directory with strict POSIX permissions** (`chmod 600`, owned by the brume user only).

**Never** check `.env` into git. The `.gitignore` shipped with `.env.example` includes the right patterns.

### Rotating secrets

Rotation **breaks determinism** — the same source value will land on a different fake. If any downstream system depends on the determinism (joins on `HASH`-ed columns, references to `FPE_ID`-mapped IDs in bug reports, etc.), plan it as a coordinated cutover:

1. Pick a date.
2. Stop refreshing downstream environments on the day of the rotation.
3. Rotate the secrets.
4. Re-run `brume execute` on all downstream environments.
5. Notify users that previous fake IDs are no longer valid.

### Read-only source account

See [`.env` reference](/docs/env/#creating-a-read-only-account-on-the-source) for the SQL grants.

## PostgreSQL compatibility

Brume supports **PostgreSQL 14, 15, 16, 17 and 18** on both source and target.

The `pg_dump` binary used by Brume (for schema replication) must be on `PATH` and **its major version must match the source's**. If your source is Postgres 17, install `postgresql-client-17`.

```bash
brume diag  # verifies pg_dump version vs source
```

## Logging

### Levels

| Flag | Level |
|---|---|
| `--quiet` | `ERROR` |
| (default) | `INFO` |
| `--verbose` | `DEBUG` |

The final per-table report is always printed to stdout, regardless of level.

### JSON logs

Use `--json` for machine ingestion (SIEM, log aggregator, CI artifact):

```bash
brume execute --json 2> logs.jsonl
```

Each line is a JSON object with `timestamp`, `level`, `event`, `table`, and contextual fields.

## Common errors

### `Connection refused`

```
FATAL: connection refused (host=db.prod.internal port=5432)
```

The source or target is unreachable. Run `brume diag` to isolate which one. Check VPN, security groups, `sslmode`.

### `pg_dump version mismatch`

```
pg_dump: error: server version: 17.2; pg_dump version: 14.10
```

Install the matching `postgresql-client-NN` package.

### `Strategy requires a type`

```
configuration error: column `users.email` declares strategy FAKE but no `type`
```

Add `type: EMAIL` (or whichever type fits). See [strategies](/docs/strategies/) and [types](/docs/semantic-types/).

### `NULLIFY on NOT NULL column`

```
configuration error: column `users.created_at` is NOT NULL but strategy is NULLIFY
```

Either pick a non-null strategy (`FAKE`, `MASK`, `HASH`, `KEEP`) or `ALTER` the column to be nullable on the target.

### `JSONB path does not resolve`

```
warning: path `$.contact.phone` never resolved across 12,498 rows of `users.metadata`
```

The path is wrong or doesn't exist in any row of the column. Inspect a few rows manually and adjust the path. Brume continues processing — this is a warning, not a fatal error.

### `Uncovered PII columns` (from `brume plan`)

`plan` is heuristic: it scans column names for PII-looking patterns (`*_email`, `*_phone`, `*_name`, `address`, `iban`, …). Review every flagged column and either:

- Add a rule in `brume.yml`, or
- Confirm explicitly with a `strategy: KEEP` rule to document the intent.

### `FK depth exceeded`

```
warning: table `events` reached at depth 5, exceeds fk_depth=3 — not extracted
```

The table isn't included in the subset. Either bump `fk_depth` or add the table as an additional root in `extraction.tables`.

## Next

- [**Recipes**](/docs/recipes/) — copy-paste production workflows.
- [**GDPR & compliance**](/docs/gdpr/) — sign-off checklist.
- [**CLI commands**](/docs/cli/) — flags and exit codes.
