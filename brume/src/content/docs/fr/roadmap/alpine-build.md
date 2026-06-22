---
title: Build Alpine
description: Produire un binaire et une image basés sur musl pour réduire la taille et la surface d'attaque.
roadmap:
  group: Packaging
  status: Planned
  order: 1
---

**Statut :** Planifié · **Priorité :** 3

## Quoi

Produire un binaire et une image conteneur Brume bâtis sur **Alpine Linux** (musl libc) — plus petits, plus légers, avec une surface d'attaque réduite par rapport aux artefacts actuels basés sur glibc.

## Pourquoi c'est important

- **Des images plus petites** rendent les pipelines CI plus rapides et les déploiements moins chers.
- **Une surface d'attaque réduite** compte pour un outil qui manipule des données de production. Moins de bibliothèques système signifie moins de CVE à suivre.
- Alpine est le standard de facto des déploiements conteneur soucieux de sécurité.

## Ce que ça débloquera

- Des images Docker plus petites pour la build [conteneurisée](/fr/roadmap/containerization/) officielle.
- Un binaire lié statiquement pour les environnements qui n'embarquent pas de JVM par défaut.
- Une CI plus simple à utiliser — pull, run, jeter.

## Questions de conception ouvertes

- Native-image (GraalVM) vs. trimming du runtime basé sur JLink.
- Si `pg_dump` (requis pour la réplication du schéma) reste une dépendance runtime ou est embarqué.
