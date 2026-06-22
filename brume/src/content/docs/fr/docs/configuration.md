---
title: Référence brume.yml
description: Le schéma complet du fichier de configuration brume.yml — extraction, anonymization, linked_columns, chemins JSONB.
---

`brume.yml` est le fichier déclaratif unique qui décrit **quoi** extraire et **comment** le transformer. Il vit à côté de votre `.env` et est chargé automatiquement par chaque sous-commande de Brume.

## Structure de premier niveau

```yaml
extraction:        # quoi copier depuis la source
  fk_depth: 3
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
          strategy: ...
          type: ...        # uniquement pour FAKE / MASK
          json_paths: ...  # uniquement pour JSONB
```

## `extraction`

Contrôle **quelles données** sont lues depuis la source.

### `extraction.fk_depth`

Nombre maximum de niveaux de clés étrangères que Brume traverse automatiquement — à la fois **parents** (la ligne pointée par une FK) et **enfants** (les lignes qui pointent vers la ligne courante).

```yaml
extraction:
  fk_depth: 3
```

Des valeurs plus élevées produisent un sous-ensemble plus complet mais extraient plus de lignes. Valeurs typiques : `2–4`.

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
| `table` | oui | Nom de la table (qualifié avec le schéma si différent de `public`, par ex. `analytics.events`) |
| `filter` | non | Clause SQL `WHERE` brute appliquée uniquement à cette table |

Le `filter` est injecté tel quel dans la requête d'extraction — il doit être du **SQL valide** pour votre version de Postgres. Quotez correctement les littéraux.

## `anonymization`

Contrôle **comment** chaque colonne est transformée.

### `anonymization.linked_columns`

Déclare que plusieurs colonnes réparties sur différentes tables représentent **la même valeur sémantique** et doivent produire **la même sortie fictive** — même quand elles ne sont pas reliées par une clé étrangère formelle.

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

L'une parmi : `FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `KEEP`. Voir [stratégies](/fr/docs/strategies/).

#### `columns[].type`

Obligatoire quand `strategy` est `FAKE` ou `MASK`. L'un parmi : `EMAIL`, `FIRST_NAME`, `LAST_NAME`, `PHONE`, `IBAN`, `ADDRESS`, `IP_ADDRESS`, `JSONB`. Voir [types sémantiques](/fr/docs/semantic-types/).

#### `columns[].json_paths`

Obligatoire quand `type` est `JSONB`. Liste des chemins JSON à anonymiser à l'intérieur du document. Les autres chemins sont conservés tels quels.

```yaml
- name: metadata
  strategy: FAKE
  type: JSONB
  json_paths:
    - path: $.contact.email
      type: EMAIL
    - path: $.contact.phone
      type: PHONE
    - path: $.shipping.address
      type: ADDRESS
```

Chaque entrée de chemin accepte :

| Clé | Requise | Description |
|---|---|---|
| `path` | oui | JSONPath (`$.champ.souschamp`) |
| `type` | oui | Type sémantique à appliquer à ce chemin |

## Règles de validation

Brume valide la configuration au démarrage et refuse de s'exécuter sur :

- Une colonne avec `strategy: FAKE` ou `MASK` sans `type`.
- Une colonne avec `strategy: NULLIFY` déclarée sur une colonne `NOT NULL`.
- Un `type: JSONB` sans `json_paths`.
- Une table référencée dans `anonymization.tables` qui n'est pas accessible depuis `extraction.tables` (vous transformeriez du vide).
- Une entrée `linked_columns` référençant une colonne également déclarée avec une stratégie différente.

Exécutez [`brume dry-run`](/fr/docs/cli/#brume-dry-run) pour attraper tout cela sans toucher la cible.

## Exemple complet

```yaml
extraction:
  fk_depth: 3
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
          strategy: FAKE
          type: JSONB
          json_paths:
            - path: $.shipping.address
              type: ADDRESS

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
- [**Variables `.env`**](/fr/docs/env/) — connexions et secrets.
