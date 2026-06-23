---
title: Your first pseudonymization
description: Write a minimal brume.yml, run brume plan then brume execute, and ship a pseudonymized copy of your database end-to-end.
---

This tutorial walks you through the full Brume flow on a minimal example. You'll write a configuration, audit it, then run the actual pseudonymization.

## 1. Set up secrets and connections

Copy the example `.env` file next to your `brume.yml`:

```bash
cp .env.template .env
```

Fill in the two secrets and the connection strings for source and target:

```bash
# Secrets — keep these safe, their leak invalidates the pseudonymization
BRUME_HMAC_SECRET=replace-me-with-a-long-random-string
BRUME_FPE_KEY=replace-me-16ch-min

# Source (read-only account recommended)
BRUME_SOURCE_HOST=db.prod.internal
BRUME_SOURCE_PORT=5432
BRUME_SOURCE_DB=app_production
BRUME_SOURCE_USER=brume_reader
BRUME_SOURCE_PASSWORD=...

# Target — another Postgres, or a directory for .sql output
BRUME_TARGET_HOST=localhost
BRUME_TARGET_PORT=5432
BRUME_TARGET_DB=app_dev
BRUME_TARGET_USER=app
BRUME_TARGET_PASSWORD=...
```

See the [`.env` reference](/docs/env/) for the full list of variables.

## 2. Write a minimal `brume.yml`

Start with a single table — `users` — and pseudonymize email, phone and the primary key.

```yaml
extraction:
  fk_depth: 3
  tables:
    - table: users

anonymization:
  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID    # automatically propagated to FKs pointing to users.id
        - name: email
          strategy: FAKE
          type: EMAIL
        - name: phone
          strategy: MASK
          type: PHONE
        - name: notes
          strategy: NULLIFY
```

See the [`brume.yml` reference](/docs/configuration/) for the full schema.

## 3. Plan before running — `brume plan`

`plan` is a command that estimates row volumes, walks foreign keys up to `fk_depth`, and most importantly lists **PII columns not covered by any rule**, it never extract anything.:

```bash
brume plan
```

Read the output carefully. Any column flagged as uncovered will be copied as-is — fix the config before going further.

## 4. Validate the config — `brume dry-run`

`dry-run` executes the full pipeline but writes nothing (the target is a `NullSink`). It catches configuration errors that `plan` doesn't — invalid strategies, type mismatches on `FAKE`, JSONB paths that don't resolve:

```bash
brume dry-run
```

## 5. Run the pseudonymization — `brume execute`

When `plan` and `dry-run` are clean, run for real:

```bash
brume execute
```

Brume copies the selected subset, transforms each column according to your rules, and writes to the target. Two runs with the same `hmac-secret` + `fpe-key` produce **identical results** — your pipeline is reproducible.

## 6. What's next

- Learn [**how Brume works internally**](/docs/how-it-works/) to build the right mental model.
- Pick the right [**strategy per column**](/docs/strategies/).
- Read the [**recipes**](/docs/recipes/) for production patterns (CI/CD refresh, multi-tenant, JSONB, `.sql` export).
- Run [**`brume audit --anonymity`**](/docs/k-anonymity/) to measure residual re-identification risk for your DPO.
