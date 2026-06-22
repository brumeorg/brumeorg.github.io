---
title: Stratégies de pseudonymisation
description: Les sept stratégies que Brume peut appliquer par colonne — FAKE, MASK, HASH, NULLIFY, FPE_ID, FPE_UUID, KEEP.
---

Une **stratégie** définit *comment une valeur réelle est transformée* avant d'être écrite vers la cible. Elle se déclare au niveau colonne dans `brume.yml`.

## En un coup d'œil

| Stratégie | Réversible ? | Joignable ? | Préserve le format ? | Requiert `type` |
|---|---|---|---|---|
| [`FAKE`](#fake) | Non | Oui (déterministe) | Non | **Oui** |
| [`MASK`](#mask) | Non | Non | Oui | **Oui** |
| [`HASH`](#hash) | Non | Oui | Non (64 car. fixes) | Non |
| [`NULLIFY`](#nullify) | N/A | Non | N/A | Non |
| [`FPE_ID`](#fpe_id) | Oui (avec la clé) | Oui | Oui | Non |
| [`FPE_UUID`](#fpe_uuid) | Oui (avec la clé) | Oui | Oui (UUID → UUID) | Non |
| [`KEEP`](#keep) | N/A | N/A | N/A | Non |

## `FAKE`

Remplace la valeur par une **valeur synthétique réaliste** générée via Datafaker, semée par le HMAC de l'original. Déterministe : la même valeur source produit toujours le même faux.

```yaml
- name: email
  strategy: FAKE
  type: EMAIL
```

**À utiliser pour** les PII de niveau affichage qui doivent avoir l'air réelles sur des captures d'écran, dans des démos ou des tests d'intégration où le code aval parse la valeur (par ex. validation d'email).

## `MASK`

**Masquage partiel** qui préserve la structure du champ. Conserve un préfixe ou un suffixe selon le type, remplace le reste par `*`.

```yaml
- name: phone
  strategy: MASK
  type: PHONE
```

**À utiliser pour** les valeurs lisibles dans le support / les logs où vous voulez que les opérateurs reconnaissent la *forme* des données (4 derniers chiffres d'une carte, premières lettres d'un nom) sans voir la valeur complète.

## `HASH`

**HMAC-SHA256** à sens unique, indexé sur `BRUME_HMAC_SECRET`. Produit une chaîne hex de 64 caractères. Déterministe, non réversible.

```yaml
- name: external_user_id
  strategy: HASH
```

**À utiliser pour** les identifiants opaques sur lesquels vous devez joindre entre tables mais que vous n'avez jamais besoin d'afficher ou d'inverser. La sortie fait toujours 64 caractères — si la colonne a une contrainte `VARCHAR(N)` plus petite, préférez `FPE_ID` ou `FPE_UUID`.

## `NULLIFY`

Remplace la valeur par **`NULL`**. La colonne doit être nullable dans le schéma cible.

```yaml
- name: free_text_notes
  strategy: NULLIFY
```

**À utiliser pour** les champs texte libre ou commentaires où les utilisateurs peuvent coller des PII qu'aucune stratégie ne peut nettoyer en toute sécurité. La minimisation la plus forte possible.

## `FPE_ID`

**Chiffrement préservant le format** (FF1 / BouncyCastle) pour les **identifiants numériques**. Entrée entière → sortie entière de la même longueur. Indexé par `BRUME_FPE_KEY`.

```yaml
- name: id
  strategy: FPE_ID
```

**À utiliser pour** les clés primaires numériques. Brume **propage automatiquement** le chiffrement à chaque clé étrangère pointant vers cette PK, l'intégrité référentielle tient donc de bout en bout.

## `FPE_UUID`

Pseudonymisation déterministe UUID-vers-UUID. Préserve le format `8-4-4-4-12`, l'unicité et les relations FK.

```yaml
- name: id
  strategy: FPE_UUID
```

**À utiliser pour** les clés primaires UUID. Même propagation automatique des FK que `FPE_ID`.

## `KEEP`

Copie la valeur **sans modification**. C'est le **comportement par défaut** pour toute colonne non déclarée dans `brume.yml`.

```yaml
- name: country_code
  strategy: KEEP
```

**À utiliser pour** les colonnes non sensibles (lookups, enums, timestamps) — même si en général vous les laissez simplement non déclarées.

## Tableau de décision — quelle stratégie quand ?

| Votre colonne est… | Choisissez |
|---|---|
| Une PK / FK numérique | `FPE_ID` |
| Une PK / FK UUID | `FPE_UUID` |
| Un email / nom / téléphone / adresse à afficher | `FAKE` (+ `type` correspondant) |
| Un téléphone / carte / ID dont la *forme* compte mais pas le contenu | `MASK` (+ `type` correspondant) |
| Une clé opaque sur laquelle vous joignez mais que vous n'affichez jamais | `HASH` |
| Un champ texte libre / notes | `NULLIFY` |
| Un enum / timestamp / booléen sûr | laisser non déclaré (= `KEEP`) |

## Suite

- [**Types sémantiques**](/fr/docs/semantic-types/) — les valeurs dont `FAKE` et `MASK` ont besoin.
- [**Référence `brume.yml`**](/fr/docs/configuration/) — le schéma de configuration complet.
