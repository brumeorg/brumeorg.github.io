---
title: Commandes CLI
description: Chaque sous-commande Brume, chaque flag, chaque code de sortie.
---

Brume expose un petit ensemble de sous-commandes. Toutes lisent le même `.env` et `brume.yml` depuis le répertoire de travail courant.

## Flags globaux

Disponibles sur chaque sous-commande :

| Flag | Effet |
|---|---|
| `-v` · `--verbose` | Logs DEBUG sur stderr |
| `-q` · `--quiet` | Logs niveau ERROR uniquement (le rapport final est toujours visible sur stdout) |
| `--json` | Sortie lisible par machine sur stdout, logs JSON sur stderr |
| `-h` · `--help` | Affiche l'aide de la commande |

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

**Exécute la pseudonymisation réelle.** Lit depuis la source, transforme, écrit vers la cible (base de données ou fichier `.sql` selon le `.env`).

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
| `1` | Erreur de configuration (`brume.yml` invalide, variable `.env` manquante) |
| `2` | Erreur d'exécution (connexion refusée, requête échouée, écriture échouée) |
| `3` | Échec de validation (colonne PII non couverte avec `--strict`, seuil k-anonymat dépassé) |

Ces codes sont stables entre versions et sûrs à utiliser dans des garde-fous CI.

## Suite

- [**Référence `brume.yml`**](/fr/docs/configuration/) — chaque clé.
- [**Référence `.env`**](/fr/docs/env/) — chaque variable.
- [**Recettes**](/fr/docs/recipes/) — workflows à copier-coller.
