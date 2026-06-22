---
title: Types sémantiques
description: Le catalogue des types que FAKE et MASK utilisent pour générer des valeurs contextuellement réalistes.
---

Un **type** déclare la *sémantique* d'une colonne pour que Brume sache quel type de valeur générer. Les types ne s'appliquent qu'aux stratégies [`FAKE`](/fr/docs/strategies/#fake) et [`MASK`](/fr/docs/strategies/#mask) — les autres stratégies n'en ont pas besoin.

## Types disponibles

| Type | Stratégie | Sortie d'exemple (`FAKE`) | Sortie d'exemple (`MASK`) |
|---|---|---|---|
| `EMAIL` | `FAKE` | `alice.smith@example.com` | `a***@e***.com` |
| `FIRST_NAME` | `FAKE` | `Alice` | `A****` |
| `LAST_NAME` | `FAKE` | `Dupont` | `D*****` |
| `PHONE` | `FAKE` · `MASK` | `+33 6 12 34 56 78` | `+33 6 ** ** ** 78` |
| `ADDRESS` | `FAKE` · `MASK` | `12 rue de la Paix, 75002 Paris` | `** rue ************, 75002 Paris` |
| `IBAN` | `FAKE` · `MASK` | `FR76 3000 6000 0112 3456 7890 189` | `FR76 **** **** **** **** **** 189` |
| `IP_ADDRESS` | `FAKE` · `MASK` | `192.168.1.42` | `192.168.*.*` |
| `JSONB` | `FAKE` | *(délégué à `json_paths`)* | — |

## Notes par type

### `EMAIL`
Génère un email syntaxiquement valide avec un faux prénom + nom + un TLD de démo sûr. Stable entre exécutions pour la même entrée + même secret.

### `FIRST_NAME` · `LAST_NAME`
Pioche dans le dataset Datafaker correspondant à la locale système, semé par HMAC. Pour obtenir une cohérence inter-tables (la même personne réelle → le même faux prénom dans `users` et `payments`), déclarez une entrée [`linked_columns`](/fr/docs/configuration/#linked-columns).

### `PHONE`
Génère un numéro de téléphone au format de la locale. `MASK` conserve le préfixe international et les derniers chiffres, remplace le milieu.

### `ADDRESS`
Génère une rue, un code postal, une ville. `MASK` conserve le code postal et la ville, masque le numéro et le nom de rue.

### `IBAN`
Génère un IBAN syntaxiquement valide (code pays et chiffres de contrôle corrects). `MASK` conserve le pays / contrôle / dernier bloc, masque le reste.

### `IP_ADDRESS`
Génère une adresse IPv4. `MASK` conserve les deux premiers octets (réseau), masque les deux derniers (hôte).

### `JSONB`
Type spécial : indique que la colonne est un document JSONB et que Brume doit déléguer à la déclaration `json_paths` pour anonymiser des **champs spécifiques** à l'intérieur du document. Voir la [recette JSONB](/fr/docs/recipes/#pseudonymiser-les-colonnes-metadata-jsonb).

## Choisir un type

Choisissez le type qui **correspond à la sémantique de la colonne**, pas à son type Postgres. Un `VARCHAR(255)` stockant des IBAN nécessite `type: IBAN`, pas « n'importe quelle chaîne ».

Si votre colonne ne rentre dans aucun type sémantique mais que vous voulez quand même une fausse valeur déterministe, **préférez `HASH`** — vous obtenez une valeur opaque stable sans essayer d'imiter un format réel.

## Suite

- [**Référence `brume.yml`**](/fr/docs/configuration/) — schéma complet de configuration.
- [**Stratégies de pseudonymisation**](/fr/docs/strategies/) — ce que fait chaque stratégie.
