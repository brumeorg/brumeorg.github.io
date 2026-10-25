---
title: CLI commands
description: Every Brume subcommand, every flag, every exit code.
---

Brume exposes a small set of subcommands. All of them read the same `.env.brume` and `brume.yml` from the current working directory.

## Global flags

Available on every subcommand:

| Flag | Effect |
|---|---|
| `-v` · `--verbose` | DEBUG logs on stderr |
| `-q` · `--quiet` | ERROR-level logs only (the final report is always visible on stdout) |
| `--json` | Machine-readable output on stdout, JSON logs on stderr |
| `-h` · `--help` | Show help for the command |

## `brume init`

Scaffolds a `.env.brume` template in the current directory, pre-filled for a given **sink type**. The argument selects which target block to write.

```bash
brume init dump    # sink = SQL dump file
brume init jdbc    # sink = PostgreSQL target over JDBC
```

| Argument | Generated sink block |
|---|---|
| `dump` | `BRUME_SINK_TYPE=DUMP` / `BRUME_SINK_OUTPUT_PATH` / `BRUME_SINK_COMPRESSION` — writes a `.sql` dump |
| `jdbc` | `BRUME_TARGET_HOST` / `BRUME_TARGET_DB` / … — writes to a live Postgres target |

Both templates also include the secret and source blocks. Edit the generated `.env.brume`, then run `brume diag` to validate it — `diag` checks the configuration without connecting to any database; `brume plan` then checks the source connection. The file replaces the legacy `.env` convention — every other subcommand reads `.env.brume` exclusively.

:::caution
`brume init` refuses to overwrite an existing `.env.brume`. Delete or rename the existing file first if you really want to regenerate it.
:::

## `brume scan`

**Generates a pre-filled `brume.yml` from the source schema.** Point `.env.brume` at the source, run `scan`, review the proposal, then run `brume plan`.

```bash
brume scan           # prompts before overwriting an existing brume.yml
brume scan --force   # CI mode — overwrites without prompting
```

The scan reads **column names and types only** — it never reads your data. It is read-only on the source.

- **PII columns** are matched on their name and get a rule: `email`, `mail`, `courriel` → `FAKE EMAIL`; `phone`, `mobile`, `tel`, `portable` → `MASK PHONE`; `first_name`, `prenom` → `FAKE FIRST_NAME`; `last_name`, `name`, `nom` → `FAKE LAST_NAME`; `address`, `adresse`, `street`, `rue` → `FAKE ADDRESS`; `city`, `zip`, `postal` → `MASK ADDRESS`; `ip_address`, `adresse_ip` → `MASK IP_ADDRESS`; `iban`, `bic` → `HASH`; `password`, `mot_de_passe`, `token`, `ssn`, `num_secu` → `HASH`; `birth`, `dob`, `naissance` → `FAKE DATE`; `gender`, `sexe` → `NULLIFY`.
- **Accents, spaces and dashes don't defeat the patterns**: `Prénom` is detected as a first name, `mot de passe` as a password, `e-mail` as an email.
- **Primary keys** become `FPE_ID` (numeric) or `FPE_UUID` (uuid). **Foreign keys** are left out on purpose — they inherit the strategy of the key they reference at run time.
- **Temporal columns** never get a text strategy: `date_last_password_update` is skipped rather than hashed into a timestamp.
- **Views, materialized views, foreign tables and partitions** are ignored: only tables are proposed, a partitioned table once.
- Names are written exactly as stored, quoted in YAML when needed (`- name: "nom de famille"`).
- The `extraction.tables` block is a TODO stub: which rows to copy is a business choice the schema can't tell.

The output is a **proposal**: matching is by name, so review every rule — `nombre_commandes` contains `nom` and is proposed as a last name.

## `brume plan`

**Read-only audit.** Counts the rows each table will receive — the rows within the `fk_depth` radius, exactly as `execute` will copy them — and lists **columns that look like PII but aren't covered by any rule**.

```bash
brume plan
```

Output:

- A volumetric summary per table (rows extracted, rows traversed via FK).
- A list of uncovered columns (heuristically detected: `email`, `phone`, `*_name`, `address`, `iban`, …).
- A list of validation warnings (nullable mismatches, missing types, etc.).

`plan` refuses configurations that can only fail — `NULLIFY` on a `NOT NULL` column, `MASK` or `FAKE` + `DATE` on a `UNIQUE` column — with exit code `1`, before anything is written.

**Always run `plan` before `execute`.** It doesn't open a write connection on the target.

## `brume dry-run`

Runs the **full pipeline** — extraction, transformation, write — but the write goes to a `NullSink`. Catches configuration errors that `plan` can't (invalid JSONB paths, type/strategy mismatches, FK resolution failures).

```bash
brume dry-run
```

Use it as the final config validation before `execute`.

## `brume execute`

**Runs the actual pseudonymization.** Reads from the source, transforms, writes to the target (database or `.sql` file depending on `.env.brume`).

```bash
brume execute
```

Exits with a per-table summary and total wall-time. Rows lost to a `UNIQUE` collision of their pseudonymized values don't stop the run (exit code `0`): they are counted per table and reported — see [UNIQUE columns and collisions](/docs/strategies/#unique-columns-and-collisions).

:::caution
`execute` writes to your target. Make sure you've reviewed the `plan` output and run `dry-run` first.
:::

## `brume audit --anonymity`

Measures **residual re-identification risk** on a pseudonymized dataset using **k-anonymity** (Sweeney 2002). It reads the **target** database set by the `BRUME_TARGET_*` variables — `SELECT` queries only — and never touches the source. See the dedicated page for details: [k-Anonymity audit](/docs/k-anonymity/).

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --output-markdown audit.md
```

| Flag | Required | Description |
|---|---|---|
| `--anonymity` | yes | Runs the k-anonymity audit — the only audit kind for now. |
| `--quasi-id "table:col1,col2,…"` | one of the two | Declares the quasi-identifier columns to test. Repeat for multiple tables. Takes precedence over `--auto-detect-quasi-id`. |
| `--auto-detect-quasi-id` | one of the two | Detects quasi-identifier columns from their names. Ignored when `--quasi-id` is set. |
| `--strict` | no | Exits with code `8` if an audited table has `k_min` below `--k-min`. |
| `--k-min N` | no | Threshold used by `--strict`. Default: `5`. |
| `--sample-rate R` | no | Fraction in `(0, 1]` of each table to scan, via `TABLESAMPLE SYSTEM`. Default: `1.0` (full scan). |
| `--output-json PATH` | no | Also writes the JSON report to a file. |
| `--output-markdown PATH` | no | Also writes the Markdown report — the one to hand to your DPO — to a file. |

The report is always printed on the console (as JSON with `--json`).

## `brume diag`

Boot check. Loads `.env.brume`, validates the configuration (secret lengths, FPE key, sink settings) and prints it with the Brume version. It **never connects** to the source or the target and doesn't look for `pg_dump`, so it runs anywhere — as a first command on a new machine, or as a Docker `HEALTHCHECK`.

```bash
brume diag
```

Connections and `pg_dump` are checked by the other commands — see [Preflight checks](#preflight-checks).

## Preflight checks

Before reading any row, `plan`, `dry-run` and `execute` run quick checks and stop at the first failure, with an explicit error code:

| Check | `plan` · `dry-run` | `execute` |
|---|---|---|
| Source reachable (`CONNECTION_SOURCE_UNREACHABLE`) | ✓ | ✓ |
| `BRUME_SCHEMA` exists on the source, and the role has `USAGE` on it | ✓ | ✓ |
| `pg_dump` on `PATH` (`PREFLIGHT_PG_DUMP_NOT_FOUND`) | — | ✓ |
| `pg_dump` major version ≥ source major version (`PREFLIGHT_PG_DUMP_VERSION_MISMATCH`) | — | ✓ |
| Target reachable (`CONNECTION_TARGET_UNREACHABLE`), the role can `CREATE`, and owns the target schema if it exists | — | ✓ (database target only) |

`brume audit` only checks that the target is reachable.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success — including runs that lost rows to a `UNIQUE` collision (reported, not fatal) |
| `1` | Configuration error (invalid `brume.yml`, missing `.env.brume` variable, configuration refused by `plan`) |
| `2` | Connection error (source or target unreachable) — also an unknown option or argument on the command line |
| `3` | `brume.max-target-rows` exceeded |
| `4` | Schema error (e.g. `pg_dump` failed) |
| `5` | Write error (target or dump file) |
| `6` | Pseudonymization error |
| `7` | Timeout (statement or total run) |
| `8` | `brume audit --anonymity`: policy violated |
| `127` | Unexpected error |
| `130` | Run cancelled (SIGTERM / Ctrl-C) |

## Next

- [**`brume.yml` reference**](/docs/configuration/) — every key.
- [**`.env.brume` reference**](/docs/env/) — every variable.
- [**Recipes**](/docs/recipes/) — copy-paste workflows.
