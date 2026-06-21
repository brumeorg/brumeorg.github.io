---
title: Merge mode
description: Run mode that merges pseudonymized data into an existing target instead of overwriting it (upsert / delta).
---

**Status:** Planned · **Priority:** 5

## What

A new execution mode that **merges** pseudonymized data into an existing target database — instead of dropping and recreating tables, perform an `UPSERT` on PKs and apply a delta.

## Why it matters

The current `execute` mode rebuilds the target from scratch. This is the right behavior when you want a clean snapshot, but it's wasteful when:

- The target is large and only a small fraction changed since the last run.
- Downstream environments cache data and don't want a hard cutover.
- You want to keep a curated subset (e.g. seed data, manually-added test users) intact across refreshes.

## What it'll unlock

- **Incremental refreshes**: only changed rows are re-pseudonymized and written.
- **Safer staging refreshes**: preserve test users, manual fixtures, and feature-flag overrides that QA teams set up on the target.
- **Faster CI/CD cycles**: a small delta runs in seconds instead of minutes.

## Open design questions

- Conflict resolution: source-wins vs. target-wins vs. skip-and-log.
- Detection of deleted rows on the source — soft delete vs. hard delete.
- Handling of FK consistency during the merge transaction.
