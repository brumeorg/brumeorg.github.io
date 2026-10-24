---
title: .env.brume variables
description: All environment variables Brume reads — secrets, source / target connections, runtime options.
---

Brume reads configuration from a `.env.brume` file in the current working directory (or from the process environment if `.env.brume` is absent). Two categories: **secrets** (mandatory) and **connections** (one source, one target).

Generate a template with [`brume init dump`](/docs/cli/#brume-init) (SQL file sink) or [`brume init jdbc`](/docs/cli/#brume-init) (PostgreSQL sink). The legacy `.env` filename is no longer read as of Brume 1.5.

:::caution[Replace the template secrets]
As of Brume 1.6, running any subcommand with `BRUME_HMAC_SECRET` or `BRUME_FPE_KEY` left at the placeholder value emitted by `brume init` triggers a warning. The placeholders are **not safe** — they're shared across every scaffold and defeat the point of pseudonymization. Replace them with high-entropy values before `brume execute`.
:::

## Secrets

These two values are the "additional information" of GDPR Art. 4.5 — protect them at the same level as the source data.

| Variable | Required | Description |
|---|---|---|
| `BRUME_HMAC_SECRET` | **yes** | Seeds `FAKE`, `HASH`, `DATE_SHIFT`, `linked_columns`. High-entropy string, at least 16 characters (32+ recommended). |
| `BRUME_FPE_KEY` | **yes** | Keys the FF1 cipher used by `FPE_ID` / `FPE_UUID`. Exactly **16, 24 or 32 characters**. |

:::caution[Rotate carefully]
Rotating these secrets **breaks determinism**: future runs produce different fakes for the same source values. If you have downstream systems that join on `HASH`-ed or `FPE_*`-encrypted columns, plan a coordinated cutover.
:::

## Source connection

The database Brume reads from. **Use a read-only account.**

| Variable | Required | Description |
|---|---|---|
| `BRUME_SOURCE_HOST` | yes | Hostname or IP |
| `BRUME_SOURCE_PORT` | no | Port. Default `5432`. |
| `BRUME_SOURCE_DB` | yes | Database name |
| `BRUME_SOURCE_USER` | yes | Username (read-only recommended) |
| `BRUME_SOURCE_PASSWORD` | yes | Password |
| `BRUME_SOURCE_SSLMODE` | no | `disable` · `prefer` · `require` · `verify-ca` · `verify-full`. Default `prefer`. |
| `BRUME_SCHEMA` | yes | The schema to pseudonymize, written exactly as stored (case, accents and spaces included, no quotes). The same schema name is used on the target. |

## Target connection (sink)

Brume supports two **sink types**, selected by `BRUME_SINK_TYPE` — `brume init jdbc` and `brume init dump` set it for you:

- **`JDBC`** (default) — write to a live PostgreSQL target.
- **`DUMP`** — write a `.sql` file, restorable with `psql`.

### Sink = `jdbc` (PostgreSQL database)

| Variable | Required | Description |
|---|---|---|
| `BRUME_TARGET_HOST` | yes | Hostname or IP |
| `BRUME_TARGET_PORT` | no | Port. Default `5460`. |
| `BRUME_TARGET_DB` | yes | Database name |
| `BRUME_TARGET_USER` | yes | Username (must be able to `CREATE` and `INSERT`) |
| `BRUME_TARGET_PASSWORD` | yes | Password |
| `BRUME_TARGET_SSLMODE` | no | Same values as source. |

### Sink = `DUMP` (SQL file)

| Variable | Required | Description |
|---|---|---|
| `BRUME_SINK_TYPE` | yes | `DUMP` |
| `BRUME_SINK_OUTPUT_PATH` | yes | Path of the `.sql` file Brume writes (e.g. `./dumps/dump.sql.gz`) |
| `BRUME_SINK_COMPRESSION` | no | `NONE` · `GZIP` · `ZSTD`. Default `GZIP`. |

With the `DUMP` sink, the target variables are ignored and no target connection is opened. The file contains the schema (from `pg_dump`) and the pseudonymized rows; it never contains a row that would break a unique index, so it always restores with `psql`.

## Runtime options

| Variable | Required | Default | Description |
|---|---|---|---|
| `BRUME_PARALLELISM` | no | `20` | Size of the connection pool. |
| `BRUME_LOCALE` | no | `en` | Datafaker locale (`en`, `fr`, `de`, …) — the language and formats of `FAKE` values. |
| `BRUME_PIPELINE_MODE` | no | `STREAMING` | `STREAMING` (chunk by chunk, bounded memory) or `BATCH` (everything in memory). |
| `BRUME_DATE_SHIFT_MAX_DAYS` | no | `30` | Window of `DATE_SHIFT`, in days. |
| `BRUME_PGDUMP_PATH` | no | `pg_dump` | The `pg_dump` command to run (may be a full path). |
| `BRUME_CONFIG_PATH` | no | `brume.yml` | Path of the rules file. |

## Example `.env.brume`

```bash
# --- Secrets (protect at the level of the source data) ---
BRUME_HMAC_SECRET=8aZb4...kpR9   # ≥ 16 chars (32+ recommended), high entropy
BRUME_FPE_KEY=AnotherSecret16c   # 16, 24 or 32 chars

# --- Source (read-only) ---
BRUME_SOURCE_HOST=db.prod.internal
BRUME_SOURCE_DB=app_production
BRUME_SOURCE_USER=brume_reader
BRUME_SOURCE_PASSWORD=...
BRUME_SOURCE_SSLMODE=require
BRUME_SCHEMA=public

# --- Sink = JDBC (local Postgres) ---
BRUME_SINK_TYPE=JDBC
BRUME_TARGET_HOST=localhost
BRUME_TARGET_DB=app_dev
BRUME_TARGET_USER=app
BRUME_TARGET_PASSWORD=...

# --- Options ---
BRUME_PARALLELISM=8
BRUME_LOCALE=fr
```

## Creating a read-only account on the source

Suggested minimal grants:

```sql
CREATE ROLE brume_reader WITH LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE app_production TO brume_reader;
GRANT USAGE ON SCHEMA public TO brume_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO brume_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO brume_reader;
```

Adjust the schema name if your tables live outside `public`.

## Next

- [**CLI commands**](/docs/cli/) — how to drive Brume from the command line.
- [**Operations & troubleshooting**](/docs/operations/) — secret management, performance, common errors.
