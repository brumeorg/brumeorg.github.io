---
title: Documentation
description: Everything you need to install, configure and operate Brume — from the first pseudonymization run to GDPR sign-off.
---

Brume produces **GDPR-aligned copies of your PostgreSQL data** for debugging, testing and demos — without ever shipping real identities.

This documentation is organized as a journey: discover, understand, look things up, operate in production.

## Start here

New to Brume? Begin with these two pages.

- [**Getting started**](/docs/getting-started/) — install Brume on Debian, Fedora or macOS and check the install.
- [**Your first pseudonymization**](/docs/first-pseudonymization/) — write a minimal `brume.yml`, run `brume plan` then `brume execute`, end-to-end in five minutes.

## Concepts

The mental model behind the tool — read these once and the rest of the docs make sense.

- [**How Brume works**](/docs/how-it-works/) — extraction, transformation, write phases. Determinism. Secrets. FK traversal.
- [**Pseudonymization strategies**](/docs/strategies/) — `FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `KEEP`. When to pick which.
- [**Semantic types**](/docs/semantic-types/) — `EMAIL`, `PHONE`, `IBAN`… how `FAKE` and `MASK` use them.

## Reference

The exhaustive doc for every flag, every key, every variable.

- [**`brume.yml`**](/docs/configuration/) — full schema of the configuration file.
- [**CLI commands**](/docs/cli/) — every subcommand, every flag, exit codes.
- [**`.env` variables**](/docs/env/) — secrets, connection strings, runtime options.

## Use it well

Production-grade usage, compliance, and troubleshooting.

- [**Recipes**](/docs/recipes/) — end-to-end task-oriented walkthroughs (refresh staging, multi-tenant, JSONB, CI/CD…).
- [**GDPR & compliance**](/docs/gdpr/) — legal position, GDPR articles covered, DPO checklist.
- [**k-Anonymity audit**](/docs/k-anonymity/) — measure residual re-identification risk.
- [**Operations & troubleshooting**](/docs/operations/) — performance, secret management, common errors.

---

**Looking for the roadmap?** See [Roadmap](/roadmap/). **Need help?** See [Support](/support/).
