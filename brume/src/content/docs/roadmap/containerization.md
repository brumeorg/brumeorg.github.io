---
title: Containerization
description: Official Docker image, versioned tags, and usage documentation for run / compose / k8s.
roadmap:
  group: Packaging
  status: Planned
  order: 2
---

**Status:** Planned · **Priority:** 4

## What

Publish an **official Docker image** for Brume, with semantic version tags and clear documentation for `docker run`, `docker compose`, and Kubernetes (`Job` / `CronJob`).

## Why it matters

Most production refreshes of staging environments are scheduled. They want a container they can drop into a cron or a workflow, mount secrets into, and forget about. Today users have to package Brume themselves.

## What it'll unlock

- One-line CI/CD refresh: `docker run brumeorg/brume:1.x.x execute` with secrets mounted as env.
- Kubernetes `CronJob` recipes for nightly staging refreshes.
- A `docker compose` recipe to validate `brume.yml` against an ephemeral Postgres pair locally.
- Reproducible runs across machines — same image, same output.

## What's needed

- An [Alpine](/roadmap/alpine-build/) base for size.
- Image scanning in CI (Trivy / Grype).
- Multi-arch builds (`amd64` + `arm64`).
- Signed images (cosign).
