---
title: Commandes CLI
description: Chaque sous-commande Brume, chaque flag, chaque code de sortie.
---

Brume expose un petit ensemble de sous-commandes. Toutes lisent le même `.env.brume` et `brume.yml` depuis le répertoire de travail courant.

## Flags globaux

Disponibles sur chaque sous-commande :

| Flag | Effet |
|---|---|
| `-v` · `--verbose` | Logs DEBUG sur stderr |
| `-q` · `--quiet` | Logs niveau ERROR uniquement (le rapport final est toujours visible sur stdout) |
| `--json` | Sortie lisible par machine sur stdout, logs JSON sur stderr |
| `-h` · `--help` | Affiche l'aide de la commande |

## `brume init`

Génère un template `.env.brume` dans le répertoire courant, pré-rempli pour un **type de sink** donné. L'argument sélectionne le bloc cible à écrire.

```bash
brume init dump    # sink = fichier SQL
brume init jdbc    # sink = cible PostgreSQL via JDBC
```

| Argument | Bloc sink généré |
|---|---|
| `dump` | `BRUME_SINK_TYPE=DUMP` / `BRUME_SINK_OUTPUT_PATH` / `BRUME_SINK_COMPRESSION` — écrit un dump `.sql` |
| `jdbc` | `BRUME_TARGET_HOST` / `BRUME_TARGET_DB` / … — écrit vers une cible Postgres live |

Les deux templates incluent aussi les blocs secrets et source. Éditez le `.env.brume` généré, puis exécutez `brume diag` pour le valider — `diag` vérifie la configuration sans se connecter à aucune base ; `brume plan` vérifie ensuite la connexion à la source. Ce fichier remplace la convention `.env` historique — toutes les autres sous-commandes lisent exclusivement `.env.brume`.

:::caution
`brume init` refuse d'écraser un `.env.brume` existant. Supprimez ou renommez le fichier existant si vous voulez vraiment le régénérer.
:::

## `brume scan`

**Génère un `brume.yml` pré-rempli à partir du schéma source.** Pointez `.env.brume` sur la source, lancez `scan`, relisez la proposition, puis lancez `brume plan`.

```bash
brume scan           # demande avant d'écraser un brume.yml existant
brume scan --force   # mode CI — écrase sans demander
```

Le scan lit **uniquement les noms et types de colonnes** — il ne lit jamais vos données. Il est en lecture seule sur la source.

- Les **colonnes PII** sont repérées par leur nom et reçoivent une règle : `email`, `mail`, `courriel` → `FAKE EMAIL` ; `phone`, `mobile`, `tel`, `portable` → `MASK PHONE` ; `first_name`, `prenom` → `FAKE FIRST_NAME` ; `last_name`, `name`, `nom` → `FAKE LAST_NAME` ; `address`, `adresse`, `street`, `rue` → `FAKE ADDRESS` ; `city`, `ville`, `zip`, `postal` → `MASK ADDRESS` ; `ip_address`, `adresse_ip` → `MASK IP_ADDRESS` ; `iban`, `bic` → `HASH` ; `password`, `mot_de_passe`, `token`, `ssn`, `num_secu` → `HASH` ; `birth`, `dob`, `naissance` → `FAKE DATE` ; `gender`, `sexe` → `NULLIFY`.
- **Accents, espaces et tirets n'empêchent pas la détection** : `Prénom` est reconnu comme un prénom, `mot de passe` comme un mot de passe, `e-mail` comme un email.
- Les **clés primaires** passent en `FPE_ID` (numérique) ou `FPE_UUID` (uuid). Les **clés étrangères** sont volontairement omises — elles héritent à l'exécution de la stratégie de la clé qu'elles référencent.
- Les **colonnes temporelles** ne reçoivent jamais de stratégie texte : `date_derniere_maj_password` est ignorée plutôt que hachée dans un timestamp.
- Les **vues, vues matérialisées, tables étrangères et partitions** sont ignorées : seules les tables sont proposées, une table partitionnée une seule fois.
- Les noms sont écrits tels qu'ils sont stockés, entre guillemets YAML si nécessaire (`- name: "nom de famille"`).
- Le bloc `extraction.tables` est un squelette à compléter : quelles lignes copier est un choix métier que le schéma ne peut pas déduire.

Le résultat est une **proposition** : la détection se fait sur les noms, relisez donc chaque règle — `nombre_commandes` contient `nom` et est proposé comme nom de famille.

## `brume plan`

**Audit en lecture seule.** Compte les lignes que recevra chaque table — celles du rayon `fk_depth`, exactement comme `execute` les copiera — et liste les **colonnes qui ressemblent à des PII mais ne sont couvertes par aucune règle**.

```bash
brume plan
```

Sortie :

- Un résumé volumétrique par table (lignes extraites, lignes parcourues via FK).
- Une liste de colonnes non couvertes (détectées par heuristique : `email`, `phone`, `*_name`, `address`, `iban`, …).
- Une liste d'avertissements de validation (incohérences nullable, types manquants, etc.).

`plan` refuse les configurations qui ne peuvent qu'échouer — `NULLIFY` sur une colonne `NOT NULL`, `MASK` ou `FAKE` + `DATE` sur une colonne `UNIQUE` — avec le code de sortie `1`, avant toute écriture.

**Toujours exécuter `plan` avant `execute`.** Il n'ouvre pas de connexion en écriture sur la cible.

## `brume dry-run`

Exécute le **pipeline complet** — extraction, transformation, écriture — mais l'écriture va vers un `NullSink`. Attrape les erreurs de configuration que `plan` ne peut pas (chemins JSONB invalides, incompatibilités type/stratégie, échecs de résolution FK).

```bash
brume dry-run
```

À utiliser comme validation finale de la config avant `execute`.

## `brume execute`

**Exécute la pseudonymisation réelle.** Lit depuis la source, transforme, écrit vers la cible (base de données ou fichier `.sql` selon le `.env.brume`).

```bash
brume execute
```

Se termine avec un résumé par table et le temps total d'exécution. Les lignes perdues sur une collision `UNIQUE` de leurs valeurs pseudonymisées n'arrêtent pas l'exécution (code de sortie `0`) : elles sont comptées par table et signalées — voir [Colonnes UNIQUE et collisions](/fr/docs/strategies/#colonnes-unique-et-collisions).

:::caution
`execute` écrit sur votre cible. Assurez-vous d'avoir revu la sortie de `plan` et exécuté `dry-run` au préalable.
:::

## `brume audit --anonymity`

Mesure le **risque résiduel de ré-identification** sur un dataset pseudonymisé via le **k-anonymat** (Sweeney 2002). Il lit la base **cible** définie par les variables `BRUME_TARGET_*` — uniquement des requêtes `SELECT` — et ne touche jamais la source. Voir la page dédiée pour les détails : [Audit k-anonymat](/fr/docs/k-anonymity/).

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --output-markdown audit.md
```

| Flag | Requis | Description |
|---|---|---|
| `--anonymity` | oui | Lance l'audit de k-anonymat — le seul type d'audit pour l'instant. |
| `--quasi-id "table:col1,col2,…"` | l'un des deux | Déclare les colonnes quasi-identifiantes à tester. Répéter pour plusieurs tables. Prioritaire sur `--auto-detect-quasi-id`. |
| `--auto-detect-quasi-id` | l'un des deux | Détecte les colonnes quasi-identifiantes d'après leur nom. Ignoré si `--quasi-id` est fourni. |
| `--strict` | non | Sort avec le code `8` si une table auditée a un `k_min` inférieur à `--k-min`. |
| `--k-min N` | non | Seuil utilisé par `--strict`. Défaut : `5`. |
| `--sample-rate R` | non | Fraction dans `(0, 1]` de chaque table à parcourir, via `TABLESAMPLE SYSTEM`. Défaut : `1.0` (parcours complet). |
| `--output-json CHEMIN` | non | Écrit aussi le rapport JSON dans un fichier. |
| `--output-markdown CHEMIN` | non | Écrit aussi le rapport Markdown — celui à remettre à votre DPO — dans un fichier. |

Le rapport est toujours affiché dans la console (en JSON avec `--json`).

## `brume diag`

Vérification au démarrage. Charge `.env.brume`, valide la configuration (longueur des secrets, clé FPE, réglages du sink) et l'affiche avec la version de Brume. Il **ne se connecte jamais** à la source ni à la cible et ne cherche pas `pg_dump` : il tourne partout — comme première commande sur une nouvelle machine, ou comme `HEALTHCHECK` Docker.

```bash
brume diag
```

Les connexions et `pg_dump` sont vérifiés par les autres commandes — voir [Contrôles préalables](#contrôles-préalables).

## Contrôles préalables

Avant de lire la moindre ligne, `plan`, `dry-run` et `execute` lancent des vérifications rapides et s'arrêtent au premier échec, avec un code d'erreur explicite :

| Vérification | `plan` · `dry-run` | `execute` |
|---|---|---|
| Source joignable (`CONNECTION_SOURCE_UNREACHABLE`) | ✓ | ✓ |
| `BRUME_SCHEMA` existe sur la source, et le rôle a `USAGE` dessus | ✓ | ✓ |
| `pg_dump` sur le `PATH` (`PREFLIGHT_PG_DUMP_NOT_FOUND`) | — | ✓ |
| Version majeure de `pg_dump` ≥ version majeure de la source (`PREFLIGHT_PG_DUMP_VERSION_MISMATCH`) | — | ✓ |
| Cible joignable (`CONNECTION_TARGET_UNREACHABLE`), le rôle peut `CREATE` et possède le schéma cible s'il existe | — | ✓ (cible base de données uniquement) |

`brume audit` vérifie seulement que la cible est joignable.

## Codes de sortie

| Code | Signification |
|---|---|
| `0` | Succès — y compris une exécution qui a perdu des lignes sur une collision `UNIQUE` (signalée, pas fatale) |
| `1` | Erreur de configuration (`brume.yml` invalide, variable `.env.brume` manquante, configuration refusée par `plan`) |
| `2` | Erreur de connexion (source ou cible injoignable) — aussi une option ou un argument inconnu en ligne de commande |
| `3` | `brume.max-target-rows` dépassé |
| `4` | Erreur de schéma (par ex. échec de `pg_dump`) |
| `5` | Erreur d'écriture (cible ou fichier de dump) |
| `6` | Erreur de pseudonymisation |
| `7` | Délai dépassé (requête ou exécution totale) |
| `8` | `brume audit --anonymity` : politique non respectée |
| `127` | Erreur inattendue |
| `130` | Exécution annulée (SIGTERM / Ctrl-C) |

## Suite

- [**Référence `brume.yml`**](/fr/docs/configuration/) — chaque clé.
- [**Référence `.env.brume`**](/fr/docs/env/) — chaque variable.
- [**Recettes**](/fr/docs/recipes/) — workflows à copier-coller.
