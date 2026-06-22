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

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --report-format markdown
```

Plusieurs tables peuvent être auditées en une seule exécution en répétant `--quasi-id` :

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --quasi-id "patients:age_bucket,city,blood_type" \
  --report-out audit-2026-t2.md
```

## Lire le rapport

Le rapport a trois sections :

1. **Résumé** — `k_min`, nombre de singletons, pourcentage de lignes dans des classes d'équivalence sous le seuil.
2. **Top des combinaisons exposées** — les classes les plus petites, triées par `k` croissant.
3. **Recommandations** — suggestions concrètes : généraliser cette colonne (`date_naissance` → `année_naissance`), supprimer celle-là, ou changer sa stratégie dans `brume.yml`.

Le rapport est conçu pour être remis à votre DPO **tel quel** en aide à la décision.

## Ce que l'audit n'est *pas*

L'audit ne mesure que le k-anonymat. Il ne mesure pas :

- **La `l`-diversité** — si les attributs sensibles sont diversifiés au sein de chaque classe d'équivalence.
- **La `t`-closeness** — si la distribution des attributs sensibles à l'intérieur d'une classe correspond à la distribution globale.
- **Le risque inter-tables** — la ré-identification via des jointures entre deux de vos tables.

Ce sont des points de la Roadmap. Pour l'instant, le k-anonymat vous donne le chiffre unique le plus utile à discuter avec votre DPO.

## En CI/CD

L'audit se termine avec le **code `3`** si un seuil est dépassé, vous pouvez donc en faire un garde-fou :

```bash
brume audit --anonymity \
  --quasi-id "users:birth_date,zip_code,gender" \
  --min-k 5 \
  --report-out artifacts/k-anonymity.md
```

Utilisez ça pour maintenir les rafraîchissements de staging dans une enveloppe de risque acceptable.

## Suite

- [**RGPD & conformité**](/fr/docs/gdpr/) — checklist de validation globale.
- [**Stratégies**](/fr/docs/strategies/) — ajuster les transformations par colonne pour augmenter `k`.
