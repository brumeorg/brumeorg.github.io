---
title: CLI commands
description: Every Brume subcommand, every flag, every exit code.
---

Brume exposes a small set of subcommands. All of them read the same `.env` and `brume.yml` from the current working directory.

## Global flags

Available on every subcommand:

| Flag | Effect |
|---|---|
| `-v` · `--verbose` | DEBUG logs on stderr |
| `-q` · `--quiet` | ERROR-level logs only (the final report is always visible on stdout) |
| `--json` | Machine-readable output on stdout, JSON logs on stderr |
| `-h` · `--help` | Show help for the command |

## `brume plan`

**Read-only audit.** Estimates row volumes, walks foreign keys up to `fk_depth`, and lists **columns that look like PII but aren't covered by any rule**.

```bash
brume plan
```

Output:

- A volumetric summary per table (rows extracted, rows traversed via FK).
- A list of uncovered columns (heuristically detected: `email`, `phone`, `*_name`, `address`, `iban`, …).
- A list of validation warnings (nullable mismatches, missing types, etc.).

**Always run `plan` before `execute`.** It doesn't open a write connection on the target.

## `brume dry-run`

Runs the **full pipeline** — extraction, transformation, write — but the write goes to a `NullSink`. Catches configuration errors that `plan` can't (invalid JSONB paths, type/strategy mismatches, FK resolution failures).

```bash
brume dry-run
```

Use it as the final config validation before `execute`.

## `brume execute`

**Runs the actual pseudonymization.** Reads from the source, transforms, writes to the target (database or `.sql` file depending on `.env`).

```bash
brume execute
```

Exits with a per-table summary and total wall-time.

:::caution
`execute` writes to your target. Make sure you've reviewed the `plan` output and run `dry-run` first.
:::

## `brume audit --anonymity`

Measures **residual re-identification risk** on a pseudonymized dataset using **k-anonymity** (Sweeney 2002). See the dedicated page for details: [k-Anonymity audit](/docs/k-anonymity/).

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --report-format markdown
```

| Flag | Required | Description |
|---|---|---|
| `--quasi-id "table:col1,col2,…"` | yes | Declares the quasi-identifier columns to test. Repeat for multiple tables. |
| `--report-format markdown\|json` | no | Output format. Default: `markdown`. |
| `--report-out PATH` | no | Write the report to a file instead of stdout. |

## `brume diag`

Self-diagnostic. Verifies that the environment is sane: `pg_dump` is on `PATH`, secrets are loaded, source and target are reachable.

```bash
brume diag
```

Useful as the first command after installing Brume on a new machine, and as a CI gate before running `execute`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Configuration error (invalid `brume.yml`, missing `.env` variable) |
| `2` | Runtime error (connection refused, query failed, write failed) |
| `3` | Validation failure (uncovered PII column with `--strict`, k-anonymity threshold breached) |

These are stable across versions and safe to use in CI gates.

## Next

- [**`brume.yml` reference**](/docs/configuration/) — every key.
- [**`.env` reference**](/docs/env/) — every variable.
- [**Recipes**](/docs/recipes/) — copy-paste workflows.
