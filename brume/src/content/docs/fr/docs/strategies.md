---
title: Stratégies de pseudonymisation
description: Les huit stratégies que Brume peut appliquer par colonne — FAKE, MASK, HASH, NULLIFY, FPE_ID, FPE_UUID, DATE_SHIFT, KEEP — et leur comportement sur les colonnes UNIQUE.
---

Une **stratégie** définit *comment une valeur réelle est transformée* avant d'être écrite vers la cible. Elle se déclare au niveau colonne dans `brume.yml`.

## En un coup d'œil

| Stratégie | Réversible ? | Joignable ? | Préserve le format ? | Sans collision ? | Requiert `type` |
|---|---|---|---|---|---|
| [`FAKE`](#fake) | Non | Oui (déterministe) | Non | Suffixée sur les colonnes `UNIQUE` — voir [plus bas](#colonnes-unique-et-collisions) | **Oui** |
| [`MASK`](#mask) | Non | Non | Oui | Non | **Oui** |
| [`HASH`](#hash) | Non | Oui | Non (64 caractères fixes) | Oui | Non |
| [`NULLIFY`](#nullify) | N/A | Non | N/A | N/A | Non |
| [`FPE_ID`](#fpe_id) | Oui (avec la clé) | Oui | Entier → entier (la longueur change) | Oui | Non |
| [`FPE_UUID`](#fpe_uuid) | Oui (avec la clé) | Oui | Oui (UUID → UUID) | Oui | Non |
| [`DATE_SHIFT`](#date_shift) | Non | Oui (déterministe) | Oui | Non | Non |
| [`KEEP`](#keep) | N/A | N/A | N/A | N/A | Non |

## `FAKE`

Remplace la valeur par une **valeur synthétique réaliste** générée via Datafaker, semée par le HMAC de l'original. Déterministe : la même valeur source produit toujours le même faux.

```yaml
- name: email
  strategy: FAKE
  type: EMAIL
```

**Dates synthétiques — `FAKE` + `type: DATE`.** Il n'y a pas de stratégie `FAKE_DATE` à part : `FAKE` avec `type: DATE` tire une date déterministe, par défaut une date de naissance d'adulte plausible entre 1935 et 2008. La plage se règle par colonne — les deux bornes ensemble, dans `[1900, 2100]` :

```yaml
- name: child_birthday
  strategy: FAKE
  type: DATE
  min_year: 2008    # inclus
  max_year: 2026    # exclu
```

La vraie date est remplacée, pas perturbée : pour garder la distribution des vraies dates, utilisez plutôt [`DATE_SHIFT`](#date_shift). `brume plan` refuse `FAKE` + `DATE` sur une colonne `UNIQUE`.

Sur une colonne unique à elle seule, les faux `FIRST_NAME`, `LAST_NAME` et `ADDRESS` portent un suffixe d'unicité (`Darrell.9f3ac21b04e7d5a6`) — voir [Colonnes UNIQUE et collisions](#colonnes-unique-et-collisions).

**À utiliser pour** les PII de niveau affichage qui doivent avoir l'air réelles sur des captures d'écran, dans des démos ou des tests d'intégration où le code aval parse la valeur (par ex. validation d'email).

## `MASK`

**Masquage partiel** qui préserve la structure du champ. Conserve un préfixe ou un suffixe selon le type, remplace le reste par `*`.

```yaml
- name: phone
  strategy: MASK
  type: PHONE
```

Deux valeurs masquées sont vite identiques : `brume plan` refuse `MASK` sur une colonne `UNIQUE`.

**À utiliser pour** les valeurs lisibles dans le support / les logs où vous voulez que les opérateurs reconnaissent la *forme* des données (4 derniers chiffres d'une carte, premières lettres d'un nom) sans voir la valeur complète.

## `HASH`

**HMAC-SHA256** à sens unique, indexé sur `BRUME_HMAC_SECRET`. Produit une chaîne hex de 64 caractères. Déterministe, non réversible.

```yaml
- name: external_user_id
  strategy: HASH
```

**À utiliser pour** les identifiants opaques sur lesquels vous devez joindre entre tables mais que vous n'avez jamais besoin d'afficher ou d'inverser. La sortie fait toujours 64 caractères — si la colonne a une contrainte `VARCHAR(N)` plus petite, préférez `FPE_ID` ou `FPE_UUID`.

## `NULLIFY`

Remplace la valeur par **`NULL`**. La colonne doit être nullable : `brume plan` refuse `NULLIFY` sur une colonne `NOT NULL`.

```yaml
- name: free_text_notes
  strategy: NULLIFY
```

**À utiliser pour** les champs de texte libre ou de commentaire où les utilisateurs pourraient coller des PII qu'aucune stratégie ne peut assainir de façon sûre. La minimisation la plus forte possible.

## `FPE_ID`

**Chiffrement préservant le format** (FF1 / BouncyCastle) pour les **identifiants entiers positifs ou nuls**, indexé sur `BRUME_FPE_KEY`. C'est une bijection : deux identifiants différents ne donnent jamais la même sortie, les clés primaires restent donc uniques.

```yaml
- name: id
  strategy: FPE_ID
```

La sortie est un entier, mais **pas de même longueur** : FF1 exige une taille minimale de domaine, donc les petits identifiants ressortent plus longs (avec une clé donnée, `1` → `12227206`, `12345` → `1977275239`).

| Identifiant source | Plage de sortie | Colonne cible |
|---|---|---|
| `0` … `2 147 483 647` | `0` … `2 147 483 647` | tient dans un `integer` |
| `2 147 483 648` … `999 999 999 999 999 999` | jusqu'à 18 chiffres | exige un `bigint` |
| négatif | refusé | — |

Ni la longueur ni l'ordre des identifiants ne sont conservés — ne comptez sur aucun des deux.

**À utiliser pour** les clés primaires numériques. Brume **propage automatiquement** le chiffrement à chaque clé étrangère qui pointe vers cette PK, l'intégrité référentielle tient donc de bout en bout.

## `FPE_UUID`

Pseudonymisation déterministe UUID-vers-UUID. Préserve le format `8-4-4-4-12`, l'unicité et les relations FK.

```yaml
- name: id
  strategy: FPE_UUID
```

**À utiliser pour** les clés primaires UUID. Même propagation FK automatique que `FPE_ID`.

## `DATE_SHIFT`

**Décalage déterministe en jours** sur les colonnes temporelles (`date`, `timestamp`, `timestamptz`, `time`, `interval`). La sortie vaut l'entrée ± N jours, N tiré dans `[-max, +max]` à partir d'un HMAC de la valeur. Les cohortes d'âge et l'ordre des événements dans la fenêtre sont préservés.

```yaml
- name: birth_date
  strategy: DATE_SHIFT
```

La fenêtre se règle par `brume.date-shift.max-days` (défaut `30`, variable d'environnement `BRUME_DATE_SHIFT_MAX_DAYS`). Deux dates différentes peuvent tomber le même jour : sur une colonne de dates `UNIQUE`, attendez-vous à des collisions — voir [plus bas](#colonnes-unique-et-collisions).

**À utiliser pour** les dates d'événements et de naissance dont la distribution compte pour l'analyse. Pour une date de naissance entièrement synthétique, utilisez plutôt `FAKE` + `type: DATE`.

## `KEEP`

Copie la valeur **sans modification**. C'est le **comportement par défaut** pour toute colonne non déclarée dans `brume.yml`.

```yaml
- name: country_code
  strategy: KEEP
```

**À utiliser pour** les colonnes non sensibles (tables de référence, enums, horodatages) — même si en général on les laisse simplement non déclarées.

## Colonnes UNIQUE et collisions

Déterministe ne veut pas dire sans collision : Datafaker connaît environ 5 000 prénoms, donc deux valeurs réelles différentes peuvent recevoir le même faux. Sur une colonne `UNIQUE`, la cible rejetterait la seconde ligne. Brume traite ce cas de trois façons.

**1. Prévention.** Sur une colonne unique à elle seule (clé primaire, contrainte `UNIQUE` ou index unique), `FAKE` avec `FIRST_NAME`, `LAST_NAME` ou `ADDRESS` ajoute 64 bits dérivés de la valeur réelle exacte — `Darrell.9f3ac21b04e7d5a6`, coupé pour tenir dans le `varchar(n)`. Les colonnes qui doivent porter la même valeur (les deux côtés d'une clé étrangère, les [`linked_columns`](/fr/docs/configuration/#anonymizationlinked_columns)) reçoivent exactement la même valeur suffixée.

**2. Refus au `plan`.** `MASK` et `FAKE` + `DATE` sur une colonne `UNIQUE` collisionnent presque à coup sûr : `brume plan` les refuse (`CONFIG_SCHEMA_UNIQUE_NOT_INJECTIVE`).

**3. Perte explicite.** Une collision restante **n'arrête pas l'exécution** (code de sortie `0`). La ligne en collision n'est pas écrite, et la perte est signalée :

- un avertissement `[UNIQUE_COLLISION]` dans les logs ;
- `[WARN] N ligne(s) perdue(s)` avec le décompte par table dans le rapport console ;
- une alerte dans le comparatif plan / réel ;
- `uniqueCollisions` par table dans le rapport JSON.

Les lignes qui référencent une ligne perdue restent dans la cible avec une clé étrangère qui ne pointe sur rien.

Avec un dump `.sql` pour cible, les lignes qui casseraient un index unique sont écartées avant l'écriture : le fichier se recharge toujours avec `psql`. Les index uniques sur expression (`lower(email)`) ou partiels (`WHERE …`) ne sont pas vérifiés.

**Taux de collision résiduels** sur une colonne `UNIQUE`, mesurés ou calculés :

| Règle | Collisions |
|---|---|
| `KEEP`, `HASH`, `FPE_ID`, `FPE_UUID` | Aucune |
| `FAKE` `FIRST_NAME` / `LAST_NAME` / `ADDRESS` (suffixé) | ~1 chance sur 37 millions pour 1 million de lignes (plus sur un `varchar` de moins de 12 caractères) |
| `FAKE` `EMAIL`, `IBAN` | Aucune sur 200 000 valeurs. Deux emails qui ne diffèrent que par la casse reçoivent le même faux email. |
| `FAKE` `PHONE` | 81 (`en`) à 474 (`fr`) par million de valeurs |
| `FAKE` `IP_ADDRESS` | ~135 par million de valeurs |
| `DATE_SHIFT` | Élevées sur des dates denses (14 sur 60 jours consécutifs) |
| `UNIQUE` sur plusieurs colonnes | Pas de suffixe — dépend de la combinaison |

Pour zéro collision sur une colonne unique, utilisez `HASH`, `FPE_ID` ou `FPE_UUID`.

## Table de décision — quelle stratégie quand ?

| Votre colonne est… | Choisissez |
|---|---|
| Une PK / FK numérique | `FPE_ID` |
| Une PK / FK UUID | `FPE_UUID` |
| Un email / nom / téléphone / adresse que vous devez afficher | `FAKE` (+ `type` correspondant) |
| Un téléphone / une carte / un ID dont la *forme* compte mais pas le contenu | `MASK` (+ `type` correspondant) — pas sur une colonne `UNIQUE` |
| Une clé opaque sur laquelle vous joignez mais que vous n'affichez jamais | `HASH` |
| Une date d'événement ou de naissance dont la distribution compte | `DATE_SHIFT` |
| Un champ de commentaire / notes en texte libre | `NULLIFY` |
| Une colonne `UNIQUE` qui doit garder toutes ses lignes | `HASH`, `FPE_ID` ou `FPE_UUID` |
| Un enum / horodatage / booléen sans risque | laissez non déclaré (= `KEEP`) |

## Suite

- [**Types sémantiques**](/fr/docs/semantic-types/) — les valeurs dont `FAKE` et `MASK` ont besoin.
- [**Référence `brume.yml`**](/fr/docs/configuration/) — le schéma de configuration complet.
