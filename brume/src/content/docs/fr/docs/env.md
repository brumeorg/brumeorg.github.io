---
title: Variables .env
description: Toutes les variables d'environnement que Brume lit — secrets, connexions source / cible, options d'exécution.
---

Brume lit sa configuration depuis un fichier `.env` dans le répertoire de travail courant (ou depuis l'environnement du processus si `.env` est absent). Deux catégories : **secrets** (obligatoires) et **connexions** (une source, une cible).

## Secrets

Ces deux valeurs sont l'« information supplémentaire » de l'art. 4.5 du RGPD — protégez-les au même niveau que les données source.

| Variable | Requise | Description |
|---|---|---|
| `BRUME_HMAC_SECRET` | **oui** | Sème `FAKE`, `HASH`, `linked_columns`. N'importe quelle chaîne à haute entropie ≥ 32 caractères. |
| `BRUME_FPE_KEY` | **oui** | Clé du cipher FF1 utilisé par `FPE_ID` / `FPE_UUID`. Doit faire **au moins 16 caractères**. |

:::caution[Rotation avec précaution]
La rotation de ces secrets **casse le déterminisme** : les exécutions futures produisent des faux différents pour les mêmes valeurs source. Si vous avez des systèmes aval qui joignent sur des colonnes `HASH`-ées ou `FPE_*`-chiffrées, planifiez une bascule coordonnée.
:::

## Connexion source

La base de laquelle Brume lit. **Utilisez un compte en lecture seule.**

| Variable | Requise | Description |
|---|---|---|
| `BRUME_SOURCE_HOST` | oui | Nom d'hôte ou IP |
| `BRUME_SOURCE_PORT` | non | Port. Défaut `5432`. |
| `BRUME_SOURCE_DB` | oui | Nom de la base |
| `BRUME_SOURCE_USER` | oui | Nom d'utilisateur (lecture seule recommandé) |
| `BRUME_SOURCE_PASSWORD` | oui | Mot de passe |
| `BRUME_SOURCE_SSLMODE` | non | `disable` · `prefer` · `require` · `verify-full`. Défaut `prefer`. |

## Connexion cible

Soit une connexion Postgres, **soit** un répertoire pour la sortie `.sql`. Définissez un seul bloc, pas les deux.

### Cible = base PostgreSQL

| Variable | Requise | Description |
|---|---|---|
| `BRUME_TARGET_HOST` | oui | Nom d'hôte ou IP |
| `BRUME_TARGET_PORT` | non | Port. Défaut `5432`. |
| `BRUME_TARGET_DB` | oui | Nom de la base |
| `BRUME_TARGET_USER` | oui | Nom d'utilisateur (doit pouvoir `CREATE` et `INSERT`) |
| `BRUME_TARGET_PASSWORD` | oui | Mot de passe |
| `BRUME_TARGET_SSLMODE` | non | Mêmes valeurs que la source. |

### Cible = fichier SQL

| Variable | Requise | Description |
|---|---|---|
| `BRUME_TARGET_FILE` | oui | Chemin vers le fichier `.sql` que Brume écrira |
| `BRUME_TARGET_FILE_COMPRESS` | non | `gzip` pour compresser à la volée. Défaut : non compressé. |

Quand `BRUME_TARGET_FILE` est définie, les variables Postgres cible sont ignorées.

## Options d'exécution

| Variable | Requise | Défaut | Description |
|---|---|---|---|
| `BRUME_FK_DEPTH_OVERRIDE` | non | — | Surcharge `extraction.fk_depth` depuis `brume.yml`. Utile en CI pour des runs de smoke rapides. |
| `BRUME_PARALLELISM` | non | `4` | Nombre de threads workers pour la transformation. |
| `BRUME_LOG_FORMAT` | non | `pretty` | `pretty` ou `json`. Le flag `--json` surcharge cette valeur. |
| `BRUME_LOCALE` | non | système | Locale pour Datafaker (par ex. `fr_FR`, `en_US`, `de_DE`). |

## Exemple `.env`

```bash
# --- Secrets (protéger au niveau des données source) ---
BRUME_HMAC_SECRET=8aZb4...kpR9   # ≥ 32 car., haute entropie
BRUME_FPE_KEY=AnotherSecret16ch  # ≥ 16 car.

# --- Source (lecture seule) ---
BRUME_SOURCE_HOST=db.prod.internal
BRUME_SOURCE_DB=app_production
BRUME_SOURCE_USER=brume_reader
BRUME_SOURCE_PASSWORD=...
BRUME_SOURCE_SSLMODE=require

# --- Cible = Postgres local ---
BRUME_TARGET_HOST=localhost
BRUME_TARGET_DB=app_dev
BRUME_TARGET_USER=app
BRUME_TARGET_PASSWORD=...

# --- Options ---
BRUME_PARALLELISM=8
BRUME_LOCALE=fr_FR
```

## Créer un compte en lecture seule sur la source

Grants minimaux suggérés :

```sql
CREATE ROLE brume_reader WITH LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE app_production TO brume_reader;
GRANT USAGE ON SCHEMA public TO brume_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO brume_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO brume_reader;
```

Ajustez le nom du schéma si vos tables vivent hors de `public`.

## Suite

- [**Commandes CLI**](/fr/docs/cli/) — comment piloter Brume en ligne de commande.
- [**Exploitation & dépannage**](/fr/docs/operations/) — gestion des secrets, performance, erreurs courantes.
