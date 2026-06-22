---
title: Conteneurisation
description: Image Docker officielle, tags versionnés et documentation d'usage pour run / compose / k8s.
roadmap:
  group: Packaging
  status: Planned
  order: 2
---

**Statut :** Planifié · **Priorité :** 4

## Quoi

Publier une **image Docker officielle** pour Brume, avec des tags en versionnement sémantique et une documentation claire pour `docker run`, `docker compose` et Kubernetes (`Job` / `CronJob`).

## Pourquoi c'est important

La plupart des rafraîchissements d'environnements de staging en production sont planifiés. Ils veulent un conteneur à laisser tomber dans un cron ou un workflow, monter des secrets dedans, et oublier. Aujourd'hui les utilisateurs doivent packager Brume eux-mêmes.

## Ce que ça débloquera

- Rafraîchissement CI/CD en une ligne : `docker run brumeorg/brume:1.x.x execute` avec les secrets montés en env.
- Recettes Kubernetes `CronJob` pour les rafraîchissements de staging nocturnes.
- Une recette `docker compose` pour valider `brume.yml` contre une paire Postgres éphémère en local.
- Exécutions reproductibles entre machines — même image, même sortie.

## Ce qui est nécessaire

- Une base [Alpine](/fr/roadmap/alpine-build/) pour la taille.
- Scan d'image en CI (Trivy / Grype).
- Builds multi-arch (`amd64` + `arm64`).
- Images signées (cosign).
