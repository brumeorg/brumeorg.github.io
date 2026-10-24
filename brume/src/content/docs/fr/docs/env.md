---
title: Variables .env.brume
description: Toutes les variables d'environnement que Brume lit — secrets, connexions source / cible, options d'exécution.
---

Brume lit sa configuration depuis un fichier `.env.brume` dans le répertoire de travail courant (ou depuis l'environnement du processus si `.env.brume` est absent). Deux catégories : **secrets** (obligatoires) et **connexions** (une source, une cible).

Générez un template avec [`brume init dump`](/fr/docs/cli/#brume-init) (sink fichier SQL) ou [`brume init jdbc`](/fr/docs/cli/#brume-init) (sink PostgreSQL). Le nom de fichier historique `.env` n'est plus lu depuis Brume 1.5.

:::caution[Remplacez les secrets du template]
Depuis Brume 1.6, exécuter n'importe quelle sous-commande avec `BRUME_HMAC_SECRET` ou `BRUME_FPE_KEY` laissés à la valeur placeholder émise par `brume init` déclenche un warning. Les placeholders ne sont **pas sûrs** — ils sont partagés entre tous les scaffolds et vident la pseudonymisation de son sens. Remplacez-les par des valeurs à haute entropie avant `brume execute`.
:::

## Secrets

Ces deux valeurs sont l'« information supplémentaire » de l'art. 4.5 du RGPD — protégez-les au même niveau que les données source.

| Variable | Requise | Description |
|---|---|---|
| `BRUME_HMAC_SECRET` | **oui** | Sème `FAKE`, `HASH`, `DATE_SHIFT`, `linked_columns`. Chaîne à haute entropie d'au moins 16 caractères (32 et plus recommandés). |
| `BRUME_FPE_KEY` | **oui** | Clé du cipher FF1 utilisé par `FPE_ID` / `FPE_UUID`. Exactement **16, 24 ou 32 caractères**. |

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
| `BRUME_SOURCE_SSLMODE` | non | `disable` · `prefer` · `require` · `verify-ca` · `verify-full`. Défaut `prefer`. |
| `BRUME_SCHEMA` | oui | Le schéma à pseudonymiser, écrit exactement comme il est stocké (casse, accents et espaces compris, sans guillemets). Le même nom de schéma est utilisé sur la cible. |

## Connexion cible (sink)

Brume supporte deux **types de sink**, choisis par `BRUME_SINK_TYPE` — `brume init jdbc` et `brume init dump` le renseignent pour vous :

- **`JDBC`** (défaut) — écrit vers une cible PostgreSQL live.
- **`DUMP`** — écrit un fichier `.sql`, rechargeable avec `psql`.

### Sink = `jdbc` (base PostgreSQL)

| Variable | Requise | Description |
|---|---|---|
| `BRUME_TARGET_HOST` | oui | Nom d'hôte ou IP |
| `BRUME_TARGET_PORT` | non | Port. Défaut `5460`. |
| `BRUME_TARGET_DB` | oui | Nom de la base |
| `BRUME_TARGET_USER` | oui | Nom d'utilisateur (doit pouvoir `CREATE` et `INSERT`) |
| `BRUME_TARGET_PASSWORD` | oui | Mot de passe |
| `BRUME_TARGET_SSLMODE` | non | Mêmes valeurs que la source. |

### Sink = `DUMP` (fichier SQL)

| Variable | Requise | Description |
|---|---|---|
| `BRUME_SINK_TYPE` | oui | `DUMP` |
| `BRUME_SINK_OUTPUT_PATH` | oui | Chemin du fichier `.sql` que Brume écrit (par ex. `./dumps/dump.sql.gz`) |
| `BRUME_SINK_COMPRESSION` | non | `NONE` · `GZIP` · `ZSTD`. Défaut `GZIP`. |

Avec le sink `DUMP`, les variables cible sont ignorées et aucune connexion à la cible n'est ouverte. Le fichier contient le schéma (issu de `pg_dump`) et les lignes pseudonymisées ; il ne contient jamais de ligne qui casserait un index unique, il se recharge donc toujours avec `psql`.

## Options d'exécution

| Variable | Requise | Défaut | Description |
|---|---|---|---|
| `BRUME_PARALLELISM` | non | `20` | Taille du pool de connexions. |
| `BRUME_LOCALE` | non | `en` | Locale Datafaker (`en`, `fr`, `de`, …) — langue et formats des valeurs `FAKE`. |
| `BRUME_PIPELINE_MODE` | non | `STREAMING` | `STREAMING` (par chunks, mémoire bornée) ou `BATCH` (tout en mémoire). |
| `BRUME_DATE_SHIFT_MAX_DAYS` | non | `30` | Fenêtre de `DATE_SHIFT`, en jours. |
| `BRUME_PGDUMP_PATH` | non | `pg_dump` | La commande `pg_dump` à lancer (éventuellement un chemin complet). |
| `BRUME_CONFIG_PATH` | non | `brume.yml` | Chemin du fichier de règles. |

## Exemple `.env.brume`

```bash
# --- Secrets (protéger au niveau des données source) ---
BRUME_HMAC_SECRET=8aZb4...kpR9   # ≥ 16 car. (32+ recommandés), haute entropie
BRUME_FPE_KEY=AnotherSecret16c   # 16, 24 ou 32 car.

# --- Source (lecture seule) ---
BRUME_SOURCE_HOST=db.prod.internal
BRUME_SOURCE_DB=app_production
BRUME_SOURCE_USER=brume_reader
BRUME_SOURCE_PASSWORD=...
BRUME_SOURCE_SSLMODE=require
BRUME_SCHEMA=public

# --- Sink = JDBC (Postgres local) ---
BRUME_SINK_TYPE=JDBC
BRUME_TARGET_HOST=localhost
BRUME_TARGET_DB=app_dev
BRUME_TARGET_USER=app
BRUME_TARGET_PASSWORD=...

# --- Options ---
BRUME_PARALLELISM=8
BRUME_LOCALE=fr
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
