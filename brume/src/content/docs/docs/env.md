---
title: .env variables
description: All environment variables Brume reads — secrets, source / target connections, runtime options.
---

Brume reads configuration from a `.env` file in the current working directory (or from the process environment if `.env` is absent). Two categories: **secrets** (mandatory) and **connections** (one source, one target).

## Secrets

These two values are the "additional information" of GDPR Art. 4.5 — protect them at the same level as the source data.

| Variable | Required | Description |
|---|---|---|
| `BRUME_HMAC_SECRET` | **yes** | Seeds `FAKE`, `HASH`, `linked_columns`. Any high-entropy string ≥ 32 chars. |
| `BRUME_FPE_KEY` | **yes** | Keys the FF1 cipher used by `FPE_ID` / `FPE_UUID`. Must be **at least 16 characters**. |

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
| `BRUME_SOURCE_SSLMODE` | no | `disable` · `prefer` · `require` · `verify-full`. Default `prefer`. |

## Target connection

Either a Postgres connection **or** a directory for `.sql` output. Set one block, not both.

### Target = PostgreSQL database

| Variable | Required | Description |
|---|---|---|
| `BRUME_TARGET_HOST` | yes | Hostname or IP |
| `BRUME_TARGET_PORT` | no | Port. Default `5432`. |
| `BRUME_TARGET_DB` | yes | Database name |
| `BRUME_TARGET_USER` | yes | Username (must be able to `CREATE` and `INSERT`) |
| `BRUME_TARGET_PASSWORD` | yes | Password |
| `BRUME_TARGET_SSLMODE` | no | Same values as source. |

### Target = SQL file

| Variable | Required | Description |
|---|---|---|
| `BRUME_TARGET_FILE` | yes | Path to the `.sql` file Brume will write |
| `BRUME_TARGET_FILE_COMPRESS` | no | `gzip` to compress on the fly. Default: uncompressed. |

When `BRUME_TARGET_FILE` is set, the Postgres target variables are ignored.

## Runtime options

| Variable | Required | Default | Description |
|---|---|---|---|
| `BRUME_FK_DEPTH_OVERRIDE` | no | — | Overrides `extraction.fk_depth` from `brume.yml`. Useful in CI for quick smoke runs. |
| `BRUME_PARALLELISM` | no | `4` | Number of worker threads for transformation. |
| `BRUME_LOG_FORMAT` | no | `pretty` | `pretty` or `json`. `--json` flag overrides this. |
| `BRUME_LOCALE` | no | system | Locale for Datafaker (e.g. `fr_FR`, `en_US`, `de_DE`). |

## Example `.env`

```bash
# --- Secrets (protect at the level of the source data) ---
BRUME_HMAC_SECRET=8aZb4...kpR9   # ≥ 32 chars, high entropy
BRUME_FPE_KEY=AnotherSecret16ch  # ≥ 16 chars

# --- Source (read-only) ---
BRUME_SOURCE_HOST=db.prod.internal
BRUME_SOURCE_DB=app_production
BRUME_SOURCE_USER=brume_reader
BRUME_SOURCE_PASSWORD=...
BRUME_SOURCE_SSLMODE=require

# --- Target = local Postgres ---
BRUME_TARGET_HOST=localhost
BRUME_TARGET_DB=app_dev
BRUME_TARGET_USER=app
BRUME_TARGET_PASSWORD=...

# --- Options ---
BRUME_PARALLELISM=8
BRUME_LOCALE=fr_FR
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
