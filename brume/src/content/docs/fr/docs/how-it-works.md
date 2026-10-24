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

1. **Extract** — part des lignes sélectionnées par `extraction.tables` et leurs clauses `filter`, puis copie chaque ligne située à au plus `fk_depth` sauts de clé étrangère, vers les parents comme vers les enfants (plus, par défaut, chaque parent dont ces lignes ont besoin — voir [`orphan_policy`](/fr/docs/configuration/#extractionorphan_policy)).
2. **Transform** — pour chaque ligne, applique la stratégie par colonne déclarée dans `anonymization.tables[].columns`. Les colonnes non déclarées sont copiées telles quelles (`KEEP`).
3. **Write** — pousse vers la base cible ou vers un fichier `.sql` portable. Une ligne dont la valeur pseudonymisée casserait une contrainte `UNIQUE` n'est pas écrite, et la perte est signalée (voir [Colonnes UNIQUE et collisions](/fr/docs/strategies/#colonnes-unique-et-collisions)).

## Stratégie vs Type

Deux concepts que vous verrez partout :

| | Ce qu'il contrôle | Où il vit |
|---|---|---|
| **Stratégie** | *Comment* la valeur est transformée (`FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `DATE_SHIFT`, `KEEP`) | Obligatoire sur chaque colonne déclarée |
| **Type** | *Quel type de valeur* produire (`EMAIL`, `PHONE`, `IBAN`, …) | Obligatoire uniquement pour `FAKE` et `MASK` |

Une colonne se configure comme une paire `(stratégie, type?)`. Voir [stratégies](/fr/docs/strategies/) et [types sémantiques](/fr/docs/semantic-types/) pour le panorama complet.

## Déterminisme — la propriété centrale

Chaque transformation est **indexée par vos secrets** (`hmac-secret` et `fpe-key`) et **déterministe** :

> Même entrée + même secret = même sortie, **à chaque fois**.

C'est ce qui rend Brume utilisable dans des workflows réels :

- **Tests stables** — vos fixtures de test ne changent pas entre les exécutions.
- **Datasets joignables** — un email passé par `HASH` dans deux tables est haché vers la même valeur, donc les jointures fonctionnent toujours.
- **Sessions de debug reproductibles** — un bug que vous avez reproduit hier sur `users.id = FPE_ID(42) = 7831` est encore à `7831` demain.

Le déterminisme est ce qui distingue une pseudonymisation d'un anonymiseur à bruit aléatoire. Il ne garantit pas l'absence de collision : deux valeurs différentes peuvent recevoir le même faux — voir [Colonnes UNIQUE et collisions](/fr/docs/strategies/#colonnes-unique-et-collisions).

## Déterminisme et versions

Le déterminisme vaut **pour toutes les versions d'une même version majeure** : Brume 2.0, 2.1, 2.2… donnent la même sortie pour la même entrée, les mêmes secrets et la même locale. Des sorties de référence sont figées dans la suite de tests de Brume, et en changer une impose une nouvelle version majeure.

La **2.0** change certaines sorties par rapport à la 1.x :

- `FAKE` + `PHONE` : le format est conservé, les chiffres sont désormais tirés de la graine HMAC (1,6 % des valeurs entraient en collision auparavant).
- Les faux prénoms, noms et adresses sur une colonne `UNIQUE` portent un suffixe d'unicité.
- Dumps `.sql` : les horodatages sont écrits avec leur décalage UTC. Un `timestamptz` se recharge au bon instant quel que soit le fuseau de la session de chargement — il était auparavant décalé de l'écart de fuseau entre la machine qui exécute Brume et le serveur.

En passant de la 1.x à la 2.0, repseudonymisez chaque base que vous devez rapprocher ou comparer : les valeurs ci-dessus changent une fois.

La **2.1** ne change aucune sortie. Elle accepte `FAKE` sur des colonnes reliées par une clé étrangère sans entrée `linked_columns` : passer de la 2.0 à la 2.1 ne demande aucune nouvelle exécution.

## Les clés étrangères sont préservées automatiquement

Quand vous déclarez `id` de `users` en `FPE_ID`, Brume détecte chaque clé étrangère qui pointe vers `users.id` (par ex. `orders.user_id`) et la réécrit avec le **même chiffrement**. Résultat : les contraintes FK sur la cible tiennent sans désactiver de triggers. Il en va de même pour `HASH` et — depuis la 2.1 — `FAKE`, quel que soit le bout de la clé étrangère sur lequel vous déclarez la règle — un `FAKE EMAIL` sur `customers.email` s'applique aussi à `orders.customer_email` si une clé étrangère les relie.

Pour les valeurs qui doivent correspondre entre des tables non jointes par une FK formelle (par ex. un `email` partagé entre `users.email` et `audit_logs.user_email`), utilisez [`linked_columns`](/fr/docs/configuration/#anonymizationlinked_columns).

## Secrets — l'information supplémentaire

L'article 4.5 du RGPD définit la pseudonymisation comme un traitement tel que les données ne peuvent plus être attribuées à une personne **sans recourir à des informations supplémentaires conservées séparément**. Dans Brume, cette « information supplémentaire » est exactement :

- `BRUME_HMAC_SECRET` — sème `FAKE`, `HASH` et `linked_columns`.
- `BRUME_FPE_KEY` — clé du chiffrement préservant le format utilisé par `FPE_ID` et `FPE_UUID`.

**Protégez-les au même niveau que les données source.** Leur fuite n'est pas « juste une fuite de config » — elle invalide la pseudonymisation elle-même.

## Sorties

Brume peut écrire vers deux types de cible :

- **Une autre base PostgreSQL** — chemin le plus rapide, idéal pour les environnements `dev` / `staging` / debug.
- **Un fichier `.sql`** — portable, livrable, importable avec `psql`. Utile pour les artefacts CI ou la revue DPO.

Le type de sink se choisit au scaffold avec `brume init dump` ou `brume init jdbc`, puis se règle dans `.env.brume` — voir la [référence `.env.brume`](/fr/docs/env/).

## Suite

- [**Stratégies de pseudonymisation**](/fr/docs/strategies/) — ce que produit chaque stratégie et quand l'utiliser.
- [**Types sémantiques**](/fr/docs/semantic-types/) — les valeurs que `FAKE` et `MASK` peuvent générer.
- [**Référence `brume.yml`**](/fr/docs/configuration/) — chaque clé, chaque option.
