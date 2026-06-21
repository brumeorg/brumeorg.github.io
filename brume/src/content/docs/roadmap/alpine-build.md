---
title: Alpine build
description: Produce a musl-based binary and image to reduce size and attack surface.
---

**Status:** Planned · **Priority:** 3

## What

Produce a Brume binary and container image built on **Alpine Linux** (musl libc) — smaller, leaner, with a reduced attack surface compared to the current glibc-based artifacts.

## Why it matters

- **Smaller images** make CI pipelines faster and deployments cheaper.
- **Reduced attack surface** matters for a tool that handles production data — fewer system libraries means fewer CVEs to track.
- Alpine is the de-facto standard for security-conscious container deployments.

## What it'll unlock

- Smaller Docker images for the official [containerized](/roadmap/containerization/) build.
- A statically-linked binary for environments that don't ship a JVM by default.
- Lower-friction CI usage — pull, run, throw away.

## Open design questions

- Native-image (GraalVM) vs. JLink-based runtime trimming.
- Whether `pg_dump` (required for schema replication) stays a runtime dependency or gets bundled.
