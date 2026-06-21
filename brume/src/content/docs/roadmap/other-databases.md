---
title: Other databases
description: Extend Brume beyond PostgreSQL — MySQL, SQL Server, MongoDB.
---

**Status:** Exploration · **Priority:** 6

## What

Extend Brume's support beyond PostgreSQL to:

- **MySQL** (and MariaDB)
- **SQL Server**
- **MongoDB**

## Why it matters

PostgreSQL is Brume's first-class home, but many teams operate **polyglot data stacks**. Asking them to maintain a different pseudonymization tool per engine fragments their compliance story and multiplies the secrets they have to protect.

## What it'll unlock

- A single pseudonymization tool across heterogeneous stacks.
- Shared `BRUME_HMAC_SECRET` / `BRUME_FPE_KEY` across engines, with cross-engine `linked_columns` keeping the same fake value coherent.
- A consolidated DPO sign-off across the whole data platform, not just one engine.

## Order of attack (tentative)

1. **MySQL / MariaDB** — closest cousin to Postgres, similar FK and constraint model, reuses most of the pipeline.
2. **SQL Server** — more enterprise demand, requires careful handling of schema and identity columns.
3. **MongoDB** — different paradigm (document store, no FKs). Needs a different abstraction layer; `linked_columns` becomes the primary mechanism.

## Open design questions

- One unified config schema vs. per-engine YAML.
- How to map FPE on engines without a native equivalent to Postgres's domain types.
- Schema discovery on MongoDB — strict schema vs. sampled.
