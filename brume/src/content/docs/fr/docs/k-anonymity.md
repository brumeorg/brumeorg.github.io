---
title: Audit k-anonymat
description: Mesurer le risque résiduel de ré-identification sur un dataset pseudonymisé et produire un rapport prêt pour le DPO.
---

La pseudonymisation remplace les identifiants directs (nom, email, ID). Mais une ligne peut rester ré-identifiable à travers une **combinaison d'attributs indirects** — date de naissance + code postal + genre, par exemple. La sous-commande `brume audit --anonymity` mesure ce risque résiduel.

## Qu'est-ce que le k-anonymat ?

Un dataset est **k-anonyme** par rapport à un ensemble de *quasi-identifiants* si chaque combinaison de ces valeurs apparaît dans **au moins `k` lignes**.

Introduite par [Sweeney (2002)](https://epic.org/wp-content/uploads/privacy/reidentification/Sweeney_Article.pdf), la métrique capture un risque spécifique : si votre ligne est unique sur `(date_naissance, code_postal, genre)`, quiconque connaît ces trois valeurs sur vous peut vous extraire du dataset — même si votre nom a été remplacé.

## Quasi-identifiants

Un **quasi-identifiant** est une colonne dont la valeur n'est pas un identifiant direct à elle seule, mais qui contribue à vous identifier quand elle est combinée à d'autres.

Exemples courants :

- Démographiques : `date_naissance`, `genre`, `nationalité`, `code_postal`, `ville`
- Comportementaux : `plan_abonnement` + `created_at` + `last_login_at`
- Géographiques : coordonnées `lat`/`lng` arrondies

Vous les déclarez par table au moment de l'audit.

## Classes singleton

Une **classe singleton** est une combinaison de valeurs quasi-identifiantes qui apparaît dans **exactement une ligne**. Les singletons sont les lignes les plus ré-identifiables de votre dataset — celles que l'audit met en évidence en premier.

`k = 1` signifie qu'au moins un singleton existe. Cibles courantes : `k ≥ 5` (protection légère) jusqu'à `k ≥ 50` (protection forte pour datasets sensibles).

## Exécuter l'audit

Lancez-le après `brume execute` : l'audit lit la base **cible** — la copie pseudonymisée, définie par les variables `BRUME_TARGET_*` — uniquement avec des requêtes `SELECT`.

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender"
```

Plusieurs tables peuvent être auditées en une seule exécution en répétant `--quasi-id`. `--output-markdown` écrit aussi le rapport dans un fichier :

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --quasi-id "patients:age_bucket,city,blood_type" \
  --output-markdown audit-2026-t2.md
```

Sans `--quasi-id`, `--auto-detect-quasi-id` choisit les colonnes quasi-identifiantes d'après leur nom. Sur de grosses tables, `--sample-rate 0.1` ne parcourt que 10 % de chaque table (`TABLESAMPLE SYSTEM`), au prix de la précision. Tous les flags sont dans la [référence CLI](/fr/docs/cli/#brume-audit---anonymity).

## Lire le rapport

Le rapport contient :

1. **Un en-tête** — schéma cible, date de l'audit, politique (seuil `--strict` ou informatif), `k_min` global et verdict.
2. **Une synthèse par table** — colonnes quasi-identifiantes, `k_min`, `k` moyen, lignes, classes d'équivalence, singletons.
3. **La distribution des tailles de classes** — combien de classes ont `k = 1`, `2–4`, `5–9`, `10–99`, `≥ 100`.
4. **Les classes singletons** — les combinaisons identifiables de manière unique, plafonnées par table.
5. **Des recommandations** — ce qu'il faut changer pour augmenter `k`.
6. **Méthodologie & limites.**

Le rapport Markdown (`--output-markdown`) est conçu pour être remis à votre DPO **tel quel** en aide à la décision.

## Ce que l'audit n'est *pas*

L'audit ne mesure que le k-anonymat. Il ne mesure pas :

- **La `l`-diversité** — si les attributs sensibles sont diversifiés au sein de chaque classe d'équivalence.
- **La `t`-closeness** — si la distribution des attributs sensibles à l'intérieur d'une classe correspond à la distribution globale.
- **Le risque inter-tables** — la ré-identification via des jointures entre deux de vos tables.

Ce sont des points de la Roadmap. Pour l'instant, le k-anonymat vous donne le chiffre unique le plus utile à discuter avec votre DPO.

## En CI/CD

Avec `--strict`, l'audit se termine avec le **code `8`** quand le `k_min` d'une table est inférieur à `--k-min` (défaut `5`) : vous pouvez donc en faire un garde-fou :

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --strict --k-min 5 \
  --output-markdown artifacts/k-anonymity.md
```

Utilisez ça pour maintenir les rafraîchissements de staging dans une enveloppe de risque acceptable.

## Suite

- [**RGPD & conformité**](/fr/docs/gdpr/) — checklist de validation globale.
- [**Stratégies**](/fr/docs/strategies/) — ajuster les transformations par colonne pour augmenter `k`.
