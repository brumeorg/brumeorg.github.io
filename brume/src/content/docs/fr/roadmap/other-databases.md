---
title: Autres bases de données
description: Étendre Brume au-delà de PostgreSQL — MySQL, SQL Server, MongoDB.
roadmap:
  group: Engine
  status: Exploration
  order: 2
---

**Statut :** Exploration · **Priorité :** 6

## Quoi

Étendre le support de Brume au-delà de PostgreSQL à :

- **MySQL** (et MariaDB)
- **SQL Server**
- **MongoDB**

## Pourquoi c'est important

PostgreSQL est la maison de première classe de Brume, mais beaucoup d'équipes opèrent des **stacks data polyglottes**. Leur demander de maintenir un outil de pseudonymisation différent par moteur fragmente leur récit de conformité et multiplie les secrets qu'elles doivent protéger.

## Ce que ça débloquera

- Un outil unique de pseudonymisation à travers des stacks hétérogènes.
- `BRUME_HMAC_SECRET` / `BRUME_FPE_KEY` partagés entre moteurs, avec des `linked_columns` inter-moteurs maintenant la même valeur fictive cohérente.
- Une validation DPO consolidée à travers toute la plateforme data, pas juste un moteur.

## Ordre d'attaque (provisoire)

1. **MySQL / MariaDB** — cousin le plus proche de Postgres, modèle FK et contraintes similaire, réutilise la majorité du pipeline.
2. **SQL Server** — plus de demande entreprise, requiert une gestion soignée du schéma et des colonnes identité.
3. **MongoDB** — paradigme différent (store de documents, pas de FK). Demande une couche d'abstraction différente ; `linked_columns` devient le mécanisme principal.

## Questions de conception ouvertes

- Schéma de config unifié unique vs. YAML par moteur.
- Comment mapper FPE sur des moteurs sans équivalent natif des types de domaine de Postgres.
- Découverte du schéma sur MongoDB — schéma strict vs. échantillonné.
