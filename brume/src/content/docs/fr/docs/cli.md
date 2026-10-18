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
| `dump` | `BRUME_TARGET_FILE` / `BRUME_TARGET_FILE_COMPRESS` — écrit un dump `.sql` |
| `jdbc` | `BRUME_TARGET_HOST` / `BRUME_TARGET_DB` / … — écrit vers une cible Postgres live |

Les deux templates incluent aussi les blocs secrets et source. Éditez le `.env.brume` généré, puis exécutez `brume diag` pour valider la configuration. Ce fichier remplace la convention `.env` historique — toutes les autres sous-commandes lisent exclusivement `.env.brume`.

:::caution
`brume init` refuse d'écraser un `.env.brume` existant. Supprimez ou renommez le fichier existant si vous voulez vraiment le régénérer.
:::

## `brume scan`

**Découverte de PII autonome.** Scanne la base source et liste chaque colonne qui ressemble à une donnée personnelle, groupée par type sémantique. Contrairement à `brume plan`, `scan` ne requiert pas de `brume.yml` — pointez-le sur une source et il vous dit quelles PII vivent dans votre schéma.

```bash
brume scan
```

Sortie : une entrée par colonne, avec le type sémantique détecté et l'heuristique qui a matché (nom de colonne, regex sur un échantillon de valeurs, ou les deux).

**Catégories de PII détectées :**

| Catégorie | Détectée sur |
|---|---|
| `EMAIL` | Colonnes nommées `email`, `*_email`, `mail`, `e_mail` — et valeurs correspondant à la forme RFC 5322 sur un échantillon. |
| `FIRST_NAME` | Colonnes nommées `first_name`, `firstname`, `given_name`, `prenom`. |
| `LAST_NAME` | Colonnes nommées `last_name`, `lastname`, `surname`, `family_name`, `nom`. |
| `PHONE` | Colonnes nommées `phone`, `*_phone`, `mobile`, `tel`, `telephone`, `msisdn` — et valeurs correspondant à E.164 ou aux formats nationaux courants. |
| `ADDRESS` | Colonnes nommées `address`, `street`, `postal_code`, `zip`, `city`, `country` (et leurs variantes localisées). |
| `IBAN` | Colonnes nommées `iban`, `bank_account`, `account_number` — et valeurs vérifiant les clés de contrôle IBAN (ISO 13616). |
| `IP_ADDRESS` | Colonnes nommées `ip`, `ip_address`, `client_ip`, `remote_addr` — et valeurs correspondant à IPv4 ou IPv6. |
| `JSONB` | Colonnes `jsonb` / `json` dont les documents échantillonnés contiennent des champs imbriqués matchant une des heuristiques ci-dessus. |

Le scan est **en lecture seule** et ouvre une seule connexion à la source. Il échantillonne au plus quelques milliers de lignes par table — le budget exact est réglable via `BRUME_SCAN_SAMPLE_SIZE` (voir la [référence `.env.brume`](/fr/docs/env/)).

Utilisez `brume scan` comme **première étape** lors de l'onboarding d'une nouvelle base : il vous donne la matière brute pour écrire `brume.yml`. Puis exécutez `brume plan` pour confirmer que chaque colonne détectée est couverte par une règle.

## `brume plan`

**Audit en lecture seule.** Estime les volumes de lignes, parcourt les clés étrangères jusqu'à `fk_depth`, et liste les **colonnes qui ressemblent à des PII mais ne sont couvertes par aucune règle**.

```bash
brume plan
```

Sortie :

- Un résumé volumétrique par table (lignes extraites, lignes parcourues via FK).
- Une liste de colonnes non couvertes (détectées par heuristique : `email`, `phone`, `*_name`, `address`, `iban`, …).
- Une liste d'avertissements de validation (incohérences nullable, types manquants, etc.).

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

Se termine avec un résumé par table et le temps total d'exécution.

:::caution
`execute` écrit sur votre cible. Assurez-vous d'avoir revu la sortie de `plan` et exécuté `dry-run` au préalable.
:::

## `brume audit --anonymity`

Mesure le **risque résiduel de ré-identification** sur un dataset pseudonymisé via le **k-anonymat** (Sweeney 2002). Voir la page dédiée pour les détails : [Audit k-anonymat](/fr/docs/k-anonymity/).

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --report-format markdown
```

| Flag | Requis | Description |
|---|---|---|
| `--quasi-id "table:col1,col2,…"` | oui | Déclare les colonnes quasi-identifiantes à tester. Répéter pour plusieurs tables. |
| `--report-format markdown\|json` | non | Format de sortie. Défaut : `markdown`. |
| `--report-out CHEMIN` | non | Écrit le rapport dans un fichier plutôt que sur stdout. |

## `brume diag`

Auto-diagnostic. Vérifie que l'environnement est sain : `pg_dump` est sur le `PATH`, les secrets sont chargés, source et cible sont joignables.

```bash
brume diag
```

Utile comme première commande après installation de Brume sur une nouvelle machine, et comme garde-fou CI avant d'exécuter `execute`.

## Codes de sortie

| Code | Signification |
|---|---|
| `0` | Succès |
| `1` | Erreur de configuration (`brume.yml` invalide, variable `.env.brume` manquante) |
| `2` | Erreur d'exécution (connexion refusée, requête échouée, écriture échouée) |
| `3` | Échec de validation (colonne PII non couverte avec `--strict`, seuil k-anonymat dépassé) |

Ces codes sont stables entre versions et sûrs à utiliser dans des garde-fous CI.

## Suite

- [**Référence `brume.yml`**](/fr/docs/configuration/) — chaque clé.
- [**Référence `.env.brume`**](/fr/docs/env/) — chaque variable.
- [**Recettes**](/fr/docs/recipes/) — workflows à copier-coller.
