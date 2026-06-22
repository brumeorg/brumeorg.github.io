---
title: Mode fusion
description: Mode d'exécution qui fusionne les données pseudonymisées dans une cible existante au lieu de l'écraser (upsert / delta).
roadmap:
  group: Engine
  status: Planned
  order: 1
---

**Statut :** Planifié · **Priorité :** 5

## Quoi

Un nouveau mode d'exécution qui **fusionne** les données pseudonymisées dans une base cible existante. Au lieu de supprimer et recréer les tables, exécuter un `UPSERT` sur les PK et appliquer un delta.

## Pourquoi c'est important

Le mode `execute` actuel reconstruit la cible à partir de zéro. C'est le bon comportement quand vous voulez un snapshot propre, mais c'est gaspilleur quand :

- La cible est grosse et seule une petite fraction a changé depuis la dernière exécution.
- Les environnements aval cachent des données et ne veulent pas de bascule abrupte.
- Vous voulez préserver un sous-ensemble curé (par ex. données de seed, utilisateurs de test ajoutés manuellement) entre les rafraîchissements.

## Ce que ça débloquera

- **Rafraîchissements incrémentaux** : seules les lignes modifiées sont re-pseudonymisées et écrites.
- **Rafraîchissements de staging plus sûrs** : préservation des utilisateurs de test, des fixtures manuelles et des overrides de feature-flag que les équipes QA ont configurés sur la cible.
- **Cycles CI/CD plus rapides** : un petit delta tourne en quelques secondes au lieu de minutes.

## Questions de conception ouvertes

- Résolution de conflit : source-gagne vs. cible-gagne vs. skip-et-log.
- Détection des lignes supprimées sur la source — soft delete vs. hard delete.
- Gestion de la cohérence FK pendant la transaction de fusion.
