---
title: Exploitation & dépannage
description: Réglage de la performance, gestion des secrets, compatibilité versions Postgres, erreurs courantes et leurs correctifs.
---

Cette page rassemble tout ce dont vous avez besoin pour faire tourner Brume dans des conditions de niveau production : performance, ops, et les erreurs les plus courantes.

## Performance

### Parallélisme

`BRUME_PARALLELISM` (défaut `4`) contrôle le nombre de threads workers appliqués à l'étape de transformation. Augmentez-le sur des machines avec des cœurs disponibles et de bonnes I/O.

```bash
BRUME_PARALLELISM=12 brume execute
```

Les retours décroissants apparaissent au-delà de `2 × cœurs physiques`. Surveillez votre base source — Brume ouvre une connexion en lecture par worker.

### `fk_depth`

Un `fk_depth` plus faible extrait moins de données. Si votre bug est reproductible à la profondeur 2, ne payez pas pour la profondeur 4.

Pattern courant au moment du debug :

```bash
BRUME_FK_DEPTH_OVERRIDE=1 brume execute   # run de smoke
BRUME_FK_DEPTH_OVERRIDE=3 brume execute   # run complet
```

### Mémoire

Brume streame les lignes — il ne charge pas les tables en mémoire. Les deux endroits gourmands en mémoire sont :

- **Les colonnes JSONB avec des `json_paths` profondément imbriqués** — le parsing/serialization se fait ligne par ligne mais le heap JVM grossit avec la taille des objets.
- **Les groupes `linked_columns` à forte cardinalité** — le mapping déterministe est mis en cache en mémoire.

Démarrez avec le heap JVM par défaut et augmentez seulement si vous observez `OutOfMemoryError` dans les logs.

## Gestion des secrets

### Où stocker les secrets

Par ordre de préférence :

1. **Un gestionnaire de secrets** (Vault, AWS Secrets Manager, GCP Secret Manager, fichier chiffré SOPS).
2. **Les secrets du fournisseur CI** (GitHub Actions encrypted secrets, GitLab masked variables).
3. **Fichier `.env.brume` dans un répertoire avec permissions POSIX strictes** (`chmod 600`, possédé uniquement par l'utilisateur brume).

**Ne jamais** mettre `.env.brume` sous git. Le template généré par `brume init` peut être commité ; le fichier rempli, non.

### Rotation des secrets

La rotation **casse le déterminisme** — la même valeur source atterrira sur un faux différent. Si un système aval dépend du déterminisme (jointures sur colonnes `HASH`-ées, références à des IDs mappés `FPE_ID` dans des rapports de bug, etc.), planifiez-la comme une bascule coordonnée :

1. Choisissez une date.
2. Arrêtez le rafraîchissement des environnements aval le jour de la rotation.
3. Faites tourner les secrets.
4. Re-exécutez `brume execute` sur tous les environnements aval.
5. Notifiez les utilisateurs que les anciens faux IDs ne sont plus valides.

### Compte source en lecture seule

Voir la [référence `.env.brume`](/fr/docs/env/#créer-un-compte-en-lecture-seule-sur-la-source) pour les grants SQL.

## Compatibilité PostgreSQL

Brume supporte **PostgreSQL 14, 15, 16, 17 et 18** à la fois sur source et cible.

Le binaire `pg_dump` utilisé par Brume (pour la réplication du schéma) doit être sur le `PATH` et **sa version majeure doit correspondre à celle de la source**. Si votre source est Postgres 17, installez `postgresql-client-17`.

```bash
brume diag  # vérifie la version pg_dump vs source
```

## Logging

### Niveaux

| Flag | Niveau |
|---|---|
| `--quiet` | `ERROR` |
| (défaut) | `INFO` |
| `--verbose` | `DEBUG` |

Le rapport final par table est toujours imprimé sur stdout, peu importe le niveau.

### Logs JSON

Utilisez `--json` pour l'ingestion machine (SIEM, agrégateur de logs, artefact CI) :

```bash
brume execute --json 2> logs.jsonl
```

Chaque ligne est un objet JSON avec `timestamp`, `level`, `event`, `table` et des champs contextuels.

## Erreurs courantes

### `Connection refused`

```
FATAL: connection refused (host=db.prod.internal port=5432)
```

La source ou la cible n'est pas joignable. Exécutez `brume diag` pour isoler laquelle. Vérifiez VPN, security groups, `sslmode`.

### `pg_dump version mismatch`

```
pg_dump: error: server version: 17.2; pg_dump version: 14.10
```

Installez le paquet `postgresql-client-NN` correspondant.

### `Strategy requires a type`

```
configuration error: column `users.email` declares strategy FAKE but no `type`
```

Ajoutez `type: EMAIL` (ou le type qui correspond). Voir [stratégies](/fr/docs/strategies/) et [types](/fr/docs/semantic-types/).

### `NULLIFY on NOT NULL column`

```
configuration error: column `users.created_at` is NOT NULL but strategy is NULLIFY
```

Choisissez soit une stratégie non-null (`FAKE`, `MASK`, `HASH`, `KEEP`), soit faites un `ALTER` de la colonne pour la rendre nullable sur la cible.

### `JSONB path does not resolve`

```
warning: path `$.contact.phone` never resolved across 12,498 rows of `users.metadata`
```

Le chemin est faux ou n'existe dans aucune ligne de la colonne. Inspectez quelques lignes manuellement et ajustez le chemin. Brume continue le traitement — c'est un avertissement, pas une erreur fatale.

### `Template secret still in use`

```
warning: BRUME_HMAC_SECRET matches the value shipped by `brume init` — replace it before running `execute`
```

Introduit avec Brume 1.6. Le run n'est pas bloqué, mais toute pseudonymisation produite avec le placeholder est réversible par quiconque a accès aux sources de Brume. Générez une valeur à haute entropie (par ex. `openssl rand -base64 48` pour `BRUME_HMAC_SECRET`, `openssl rand -hex 24` pour `BRUME_FPE_KEY`) et faites tourner le `.env.brume`.

### `Uncovered PII columns` (depuis `brume plan`)

`plan` est heuristique : il scanne les noms de colonnes à la recherche de patterns ressemblant à des PII (`*_email`, `*_phone`, `*_name`, `address`, `iban`, …). Revoyez chaque colonne signalée et :

- Soit ajoutez une règle dans `brume.yml`,
- Soit confirmez explicitement par une règle `strategy: KEEP` pour documenter l'intention.

### `FK depth exceeded`

```
warning: table `events` reached at depth 5, exceeds fk_depth=3 — not extracted
```

La table n'est pas incluse dans le sous-ensemble. Soit augmentez `fk_depth`, soit ajoutez la table comme racine supplémentaire dans `extraction.tables`.

## Suite

- [**Recettes**](/fr/docs/recipes/) — workflows de production à copier-coller.
- [**RGPD & conformité**](/fr/docs/gdpr/) — checklist de validation.
- [**Commandes CLI**](/fr/docs/cli/) — flags et codes de sortie.
