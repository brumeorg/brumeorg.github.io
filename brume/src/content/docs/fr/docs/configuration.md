---
title: Référence brume.yml
description: Le schéma complet du fichier de configuration brume.yml — extraction, anonymization, linked_columns, chemins JSONB.
---

`brume.yml` est le fichier déclaratif unique qui décrit **quoi** extraire et **comment** le transformer. Il vit à côté de votre `.env.brume` et est chargé automatiquement par chaque sous-commande de Brume.

## Structure de premier niveau

```yaml
extraction:        # quoi copier depuis la source
  fk_depth: 1
  orphan_policy: KEEP_PARENTS
  tables:
    - table: ...
      filter: ...

anonymization:     # comment transformer ce qui est copié
  linked_columns:  # optionnel, pour la cohérence inter-tables
    - semantic_key: ...
      columns: [ ... ]
  tables:
    - table: ...
      columns:
        - name: ...
          strategy: ...    # pas sur une colonne JSONB
          type: ...        # uniquement pour FAKE / MASK
          json_paths: ...  # uniquement pour JSONB
```

## `extraction`

Contrôle **quelles données** sont lues depuis la source.

### `extraction.fk_depth`

Un **rayon** : une ligne est copiée quand elle se trouve à au plus `fk_depth` sauts de clé étrangère d'une ligne sélectionnée par `extraction.tables`, en comptant aussi bien les sauts vers les **parents** (la ligne pointée par une FK) que vers les **enfants** (les lignes qui pointent vers elle).

```yaml
extraction:
  fk_depth: 1
```

Avec `orders` filtrée sur 2025 :

| `fk_depth` | Lignes copiées |
|---|---|
| `1` | les commandes 2025, leurs `users`, leurs `order_items` |
| `2` | + les autres commandes de ces utilisateurs (même hors filtre), les `products` des lignes de commande |
| `3` | + les lignes de ces autres commandes, … |

Chaque saut peut ramener beaucoup plus de lignes sur une vraie base : **commencez à `1`** et n'augmentez qu'en cas de besoin. `brume plan` donne le nombre exact de lignes avant toute écriture.

### `extraction.orphan_policy`

Ce qui se passe au bord du rayon, quand une ligne copiée référence une ligne au-delà.

| Valeur | Comportement |
|---|---|
| `KEEP_PARENTS` (défaut) | Les parents de chaque ligne copiée sont copiés aussi, quelle que soit leur distance (en remontant seulement — Brume ne redescend jamais depuis eux). La cible ne contient jamais de FK qui ne pointe sur rien. |
| `ALLOW_ORPHANS` | Le rayon est strict. Les références au-delà sont gardées telles quelles : l'exécution journalise `[ORPHANS] …` par FK et les liste dans `orphanReferences` (rapport JSON). Les jointures perdent ces lignes, et recréer les contraintes FK sur la cible échoue. |

```yaml
extraction:
  fk_depth: 1
  orphan_policy: ALLOW_ORPHANS
```

### `extraction.tables`

La liste des tables racines à extraire. Brume part de celles-ci et parcourt les FK.

```yaml
extraction:
  tables:
    - table: orders
      filter: "created_at >= '2025-01-01'"
    - table: order_items
```

Chaque entrée accepte :

| Clé | Requise | Description |
|---|---|---|
| `table` | oui | Nom de la table dans le schéma défini par `BRUME_SCHEMA`, écrit exactement comme il est stocké (voir [Noms de tables et de colonnes](#noms-de-tables-et-de-colonnes)) |
| `filter` | non | Clause SQL `WHERE` brute appliquée uniquement à cette table |

Le `filter` est injecté tel quel dans la requête d'extraction — il doit être du **SQL valide** pour votre version de Postgres. Quotez correctement les littéraux.

Avant d'écrire quoi que ce soit, `plan`, `dry-run` et `execute` vérifient chaque filtre sur la source avec `EXPLAIN` — aucune ligne n'est lue. Un filtre qui cite une colonne inconnue ou ne se parse pas arrête l'exécution sur `CONFIG_EXTRACTION_FILTER_INVALID`, avec le message de PostgreSQL.

### Noms de tables et de colonnes

Écrivez les noms de tables et de colonnes **exactement comme ils sont stockés dans PostgreSQL** — casse, accents et espaces compris, **sans guillemets SQL** :

```yaml
- table: fiche client      # stockée sous "fiche client"
  columns:
    - name: prénom
      strategy: FAKE
      type: FIRST_NAME
    - name: nom de famille
      strategy: FAKE
      type: LAST_NAME
```

Tout nom PostgreSQL légal est accepté (jusqu'à 63 octets en UTF-8). Brume le met entre guillemets dans chaque requête SQL qu'il génère.

### Tables partitionnées et vues

- Une **table partitionnée** compte pour une seule table : déclarez filtres et règles sur la table partitionnée (`payment`), jamais sur ses partitions. Brume lit et écrit à travers elle, et PostgreSQL range chaque ligne dans sa partition. Les clés étrangères déclarées partition par partition sont traitées comme des clés étrangères de la table partitionnée.
- Les **vues, vues matérialisées et tables étrangères** ne sont pas des tables : elles ne peuvent pas figurer dans `brume.yml` et `brume scan` les ignore. Leurs définitions sont tout de même recréées sur la cible par la copie du schéma.

## `anonymization`

Contrôle **comment** chaque colonne est transformée.

### `anonymization.linked_columns`

Déclare que plusieurs colonnes réparties sur différentes tables représentent **la même valeur sémantique** et doivent produire **la même sortie fictive** alors qu'**aucune clé étrangère ne les relie**. Les colonnes reliées par une clé étrangère déclarée n'en ont pas besoin : la règle de l'une s'applique automatiquement aux autres.

:::note[Changé en 2.1]
Avant la 2.1, `FAKE` sur des colonnes reliées par une clé étrangère était refusé sans entrée `linked_columns` qui les couvre. Depuis la 2.1, `FAKE` suit les clés étrangères tout seul, comme `FPE_ID`, `FPE_UUID` et `HASH`.
:::

```yaml
anonymization:
  linked_columns:
    - semantic_key: user_email
      columns:
        - table: users
          column: email
        - table: audit_logs
          column: user_email
        - table: subscriptions
          column: notify_email
```

Chaque entrée a :

| Clé | Requise | Description |
|---|---|---|
| `semantic_key` | oui | Identifiant libre utilisé dans les logs (par ex. `user_email`, `client_ssn`) |
| `columns[].table` | oui | Nom de la table |
| `columns[].column` | oui | Nom de la colonne |

Toutes les colonnes listées reçoivent **la même valeur `FAKE`** pour la même entrée source.

### `anonymization.tables[]`

Liste par table de règles de colonnes.

```yaml
anonymization:
  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID
        - name: email
          strategy: FAKE
          type: EMAIL
```

#### `columns[].name`

Le nom de la colonne à transformer.

#### `columns[].strategy`

L'une parmi : `FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `DATE_SHIFT`, `KEEP`. Voir [stratégies](/fr/docs/strategies/).

Obligatoire, sauf sur une colonne `type: JSONB` : là, chaque entrée `json_paths` porte sa propre stratégie, et une `strategy` sur la colonne est ignorée avec l'avertissement `CONFIG_JSONB_STRATEGY_IGNORED`.

#### `columns[].type`

Obligatoire quand `strategy` est `FAKE` ou `MASK`. L'un parmi : `EMAIL`, `FIRST_NAME`, `LAST_NAME`, `PHONE`, `IBAN`, `ADDRESS`, `IP_ADDRESS`, `DATE`, `JSONB`. Voir [types sémantiques](/fr/docs/semantic-types/).

#### `columns[].json_paths`

Obligatoire quand `type` est `JSONB`. Les champs à anonymiser à l'intérieur du document, chacun avec sa propre stratégie. Les autres champs sont conservés tels quels — aucune entrée `KEEP` n'est nécessaire.

```yaml
- name: metadata
  type: JSONB
  json_paths:
    - path: $.contact.email
      type: EMAIL
      strategy: FAKE
    - path: $.contact.phone
      type: PHONE
      strategy: FAKE
    - path: $.session.token
      strategy: HASH
```

Chaque entrée de chemin accepte :

| Clé | Requise | Description |
|---|---|---|
| `path` | oui | Chemin depuis la racine du document, en notation pointée (`$.champ.souschamp`), à toute profondeur |
| `strategy` | oui | Stratégie appliquée à ce champ. Jamais héritée de la colonne |
| `type` | pour `FAKE` | Type sémantique de ce champ |

Un champ absent d'une ligne, ou `null`, est laissé tel quel. Un chemin dont le parent n'est pas un objet sur une ligne est ignoré pour cette ligne, avec un avertissement. Rien ne signale un chemin qui ne correspond jamais : vérifiez quelques lignes de la cible.

:::caution[Limites]
- Le document doit être un objet JSON. Une valeur qui est un tableau (`[{...}]`) ou une valeur simple est copiée telle quelle, sans avertissement.
- Les tableaux ne sont pas parcourus : `$.items[0].email` n'est pas pris en charge.
- Un chemin doit mener à une valeur, pas à un objet ni à un tableau : Brume le remplacerait par une chaîne vide, même en `KEEP`.
:::

:::note[Changé en 2.4]
Chaque entrée demande sa propre `strategy`. Avant la 2.4, une entrée sans stratégie passait la validation, puis l'exécution échouait à la première ligne. La colonne elle-même ne prend plus de `strategy` — voir [types sémantiques](/fr/docs/semantic-types/#jsonb).
:::

## Règles de validation

Brume valide la configuration au démarrage et refuse de s'exécuter sur :

- Une colonne sans `strategy` — sauf une colonne `type: JSONB`.
- Une entrée `json_paths` sans `strategy`, ou en `strategy: FAKE` sans `type`.
- Une colonne avec `strategy: FAKE` ou `MASK` sans `type`.
- Une colonne avec `strategy: NULLIFY` déclarée sur une colonne `NOT NULL`.
- `MASK`, ou `FAKE` avec `type: DATE`, sur une colonne `UNIQUE` — leurs valeurs collisionneraient (voir [Colonnes UNIQUE et collisions](/fr/docs/strategies/#colonnes-unique-et-collisions)).
- `FAKE` déclaré sur plusieurs colonnes liées par une clé étrangère avec un `type` ou des `min_year` / `max_year` différents — leurs valeurs divergeraient.
- Un `type: JSONB` sans `json_paths`.
- Une table référencée dans `anonymization.tables` qui n'est pas accessible depuis `extraction.tables` (vous transformeriez du vide).
- Une entrée `linked_columns` référençant une colonne également déclarée avec une stratégie différente.

`brume plan` signale ces cas avant toute écriture. Lancez [`brume dry-run`](/fr/docs/cli/#brume-dry-run) pour dérouler tout le pipeline sans toucher la cible.

Une erreur indique le chemin YAML (`anonymization.tables[0].columns[1].strategy`), sa ligne et les valeurs acceptées. Une clé que Brume ne connaît pas — une faute de frappe comme `fk_dpeth` — est ignorée avec un avertissement `CONFIG_UNKNOWN_KEY` qui donne sa ligne.

## Exemple complet

```yaml
extraction:
  fk_depth: 1
  tables:
    - table: orders
      filter: "created_at >= '2025-01-01'"
    - table: order_items

anonymization:
  linked_columns:
    - semantic_key: user_email
      columns:
        - table: users
          column: email
        - table: audit_logs
          column: user_email

  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID
        - name: email
          strategy: FAKE
          type: EMAIL
        - name: phone
          strategy: MASK
          type: PHONE
        - name: notes
          strategy: NULLIFY
        - name: metadata
          type: JSONB
          json_paths:
            - path: $.shipping.address
              type: ADDRESS
              strategy: FAKE

    - table: audit_logs
      columns:
        - name: user_email
          strategy: FAKE
          type: EMAIL
        - name: ip
          strategy: MASK
          type: IP_ADDRESS
```

## Suite

- [**Commandes CLI**](/fr/docs/cli/) — comment exécuter `brume plan`, `execute`, `dry-run`.
- [**Variables `.env.brume`**](/fr/docs/env/) — connexions et secrets.
