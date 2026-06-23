---
title: Recipes
description: End-to-end task-oriented walkthroughs — debug datasets, CI/CD refresh, multi-tenant, JSONB, .sql export.
---

Each recipe is a self-contained workflow: a problem statement, the configuration, and the commands to run. Copy, adapt, ship.

## Generate a debug dataset from production

**Problem.** A bug in production references `orders.id = 982331`. You want a local copy that includes that order, its `users`, its `order_items`, and nothing else.

**Configuration.**

```yaml
extraction:
  fk_depth: 3
  tables:
    - table: orders
      filter: "id = 982331"

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

**Run.**

```bash
brume plan       # check what gets pulled
brume execute    # ship to your local Postgres
```

Because `FPE_ID` is deterministic, your bug at source `id = 982331` will land at a stable target id (e.g. `7831`) every time. Reference it confidently in your debug notes.

---

## Refresh staging weekly via CI/CD

**Problem.** You want `staging` to be re-pseudonymized every Sunday night from `prod`.

**Prerequisites.** Commit your `brume.yml` at the repo root (or pass a path with `--config`). The job below assumes it's checked out alongside the workflow.

**GitHub Actions example.**

```yaml
# .github/workflows/refresh-staging.yml
name: Refresh staging from prod
on:
  schedule:
    - cron: '0 2 * * 0'  # Sunday 02:00 UTC
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4   # pulls brume.yml from the repo
      - name: Install pg_dump
        run: |
          # Match the major version to your prod source (here: Postgres 17)
          sudo apt-get update
          sudo apt-get install -y postgresql-client-17
      - name: Install Brume
        run: |
          curl -1sLf 'https://dl.cloudsmith.io/public/brume/brume/setup.deb.sh' | sudo -E bash
          sudo apt-get install -y brume
      - name: Run Brume
        env:
          BRUME_HMAC_SECRET:    ${{ secrets.BRUME_HMAC_SECRET }}
          BRUME_FPE_KEY:        ${{ secrets.BRUME_FPE_KEY }}
          BRUME_SOURCE_HOST:    ${{ secrets.PROD_HOST }}
          BRUME_SOURCE_PASSWORD: ${{ secrets.PROD_RO_PASSWORD }}
          BRUME_TARGET_HOST:    ${{ secrets.STAGING_HOST }}
          BRUME_TARGET_PASSWORD: ${{ secrets.STAGING_PASSWORD }}
        run: |
          brume diag        # fails fast if pg_dump or connectivity is off
          brume plan
          brume execute
```

Use `--json` if you want to publish structured logs as artifacts.

---

## Pseudonymize JSONB metadata columns

**Problem.** Your `users.metadata` is a JSONB document holding `contact.email`, `contact.phone`, and `shipping.address`. The rest of the document is safe.

**Configuration.**

```yaml
anonymization:
  tables:
    - table: users
      columns:
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

Other paths inside `metadata` are kept as-is. Paths that don't resolve on a given row are skipped silently — but `brume dry-run` would flag a path that **never** resolves across the whole table.

---

## Maintain consistency across microservice DBs

**Problem.** Your `users` service stores `email`; your `audit` service stores `user_email`; your `marketing` service stores `notify_email`. None are joined by a FK. You need the same real email to land on the same fake email in all three.

**Configuration.**

```yaml
anonymization:
  linked_columns:
    - semantic_key: user_email
      columns:
        - table: users
          column: email
        - table: audit_logs
          column: user_email
        - table: marketing_subscriptions
          column: notify_email
```

Run Brume independently on each service's database with the **same `BRUME_HMAC_SECRET`** — the `linked_columns` group guarantees identical fake output.

---

## Export to a portable `.sql` file

**Problem.** Your DPO wants to review a pseudonymized export offline before any production rollout.

**`.env`.**

```bash
BRUME_TARGET_FILE=./out/pseudonymized.sql
BRUME_TARGET_FILE_COMPRESS=gzip
# Postgres TARGET_* variables are ignored when TARGET_FILE is set
```

**Run.**

```bash
brume execute
```

You get `./out/pseudonymized.sql.gz`. Import with:

```bash
gunzip -c pseudonymized.sql.gz | psql -h ... -U ... -d ...
```

---

## Multi-tenant — extract a single tenant's data

**Problem.** Your schema is multi-tenant on `tenant_id`. You want to ship only tenant `42`.

**Configuration.**

```yaml
extraction:
  fk_depth: 4
  tables:
    - table: tenants
      filter: "id = 42"
    - table: users
      filter: "tenant_id = 42"
    - table: orders
      filter: "tenant_id = 42"
```

Apply the `tenant_id = 42` filter on **every root table** in the tenant scope. FK traversal pulls dependents automatically.

---

## Next

- [**GDPR & compliance**](/docs/gdpr/) — sign-off checklist.
- [**Operations & troubleshooting**](/docs/operations/) — performance, secret management, common errors.
