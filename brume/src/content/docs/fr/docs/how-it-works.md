---
title: Comment fonctionne Brume
description: Le modèle mental — extraction, transformation, écriture. Déterminisme, secrets, traversée des FK.
---

Brume est une CLI qui copie un **sous-ensemble** d'une base PostgreSQL source vers une cible (une autre instance Postgres ou un fichier `.sql`), en **transformant les données personnelles à la volée** tout en préservant l'intégrité référentielle.

## Le pipeline

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   SOURCE     │───▶│  TRANSFORM      │───▶│   CIBLE      │
│  Postgres    │    │  par colonne    │    │  Postgres    │
│ (lecture)    │    │ (déterministe)  │    │   ou .sql    │
└──────────────┘    └─────────────────┘    └──────────────┘
        │                    │                     │
   Traversée FK       hmac-secret + fpe-key   FK préservées
   Filtres lignes     stratégie par colonne   pas de triggers off
```

Trois phases :

1. **Extract** — parcourt le schéma à partir des tables déclarées dans `extraction.tables`, suit les clés étrangères jusqu'à `fk_depth` niveaux (parents et enfants), applique les clauses `filter` éventuelles.
2. **Transform** — pour chaque ligne, applique la stratégie par colonne déclarée dans `anonymization.tables[].columns`. Les colonnes non déclarées sont copiées telles quelles (`KEEP`).
3. **Write** — pousse vers la base cible ou vers un fichier `.sql` portable.

## Stratégie vs Type

Deux concepts que vous verrez partout :

| | Ce qu'il contrôle | Où il vit |
|---|---|---|
| **Stratégie** | *Comment* la valeur est transformée (`FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `KEEP`) | Obligatoire sur chaque colonne déclarée |
| **Type** | *Quel type de valeur* produire (`EMAIL`, `PHONE`, `IBAN`, …) | Obligatoire uniquement pour `FAKE` et `MASK` |

Une colonne se configure comme une paire `(stratégie, type?)`. Voir [stratégies](/fr/docs/strategies/) et [types sémantiques](/fr/docs/semantic-types/) pour le panorama complet.

## Déterminisme — la propriété centrale

Chaque transformation est **indexée par vos secrets** (`hmac-secret` et `fpe-key`) et **déterministe** :

> Même entrée + même secret = même sortie, **à chaque fois**.

C'est ce qui rend Brume utilisable dans des workflows réels :

- **Tests stables** — vos fixtures de test ne changent pas entre les exécutions.
- **Datasets joignables** — un email passé par `HASH` dans deux tables est haché vers la même valeur, donc les jointures fonctionnent toujours.
- **Sessions de debug reproductibles** — un bug que vous avez reproduit hier sur `users.id = FPE_ID(42) = 7831` est encore à `7831` demain.

Le déterminisme est ce qui distingue une pseudonymisation d'un anonymiseur à bruit aléatoire.

## Les clés étrangères sont préservées automatiquement

Quand vous déclarez `id` de `users` en `FPE_ID`, Brume détecte chaque clé étrangère qui pointe vers `users.id` (par ex. `orders.user_id`) et la réécrit avec le **même chiffrement**. Résultat : les contraintes FK sur la cible tiennent sans désactiver de triggers.

Pour les valeurs qui doivent correspondre entre des tables non jointes par une FK formelle (par ex. un `email` partagé entre `users.email` et `audit_logs.user_email`), utilisez [`linked_columns`](/fr/docs/configuration/#linked-columns).

## Secrets — l'information supplémentaire

L'article 4.5 du RGPD définit la pseudonymisation comme un traitement tel que les données ne peuvent plus être attribuées à une personne **sans recourir à des informations supplémentaires conservées séparément**. Dans Brume, cette « information supplémentaire » est exactement :

- `BRUME_HMAC_SECRET` — sème `FAKE`, `HASH` et `linked_columns`.
- `BRUME_FPE_KEY` — clé du chiffrement préservant le format utilisé par `FPE_ID` et `FPE_UUID`.

**Protégez-les au même niveau que les données source.** Leur fuite n'est pas « juste une fuite de config » — elle invalide la pseudonymisation elle-même.

## Sorties

Brume peut écrire vers deux types de cible :

- **Une autre base PostgreSQL** — chemin le plus rapide, idéal pour les environnements `dev` / `staging` / debug.
- **Un fichier `.sql`** — portable, livrable, importable avec `psql`. Utile pour les artefacts CI ou la revue DPO.

Le choix se configure dans `.env` — voir la [référence `.env`](/fr/docs/env/).

## Suite

- [**Stratégies de pseudonymisation**](/fr/docs/strategies/) — ce que produit chaque stratégie et quand l'utiliser.
- [**Types sémantiques**](/fr/docs/semantic-types/) — les valeurs que `FAKE` et `MASK` peuvent générer.
- [**Référence `brume.yml`**](/fr/docs/configuration/) — chaque clé, chaque option.
