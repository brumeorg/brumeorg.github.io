---
title: Documentation
description: Tout ce qu'il vous faut pour installer, configurer et exploiter Brume — de la première pseudonymisation à la validation RGPD.
---

Brume produit des **copies alignées RGPD de vos données PostgreSQL** pour le debug, les tests et les démos — sans jamais embarquer d'identités réelles.

Cette documentation est organisée comme un parcours : découvrir, comprendre, consulter, exploiter en production.

## Commencer ici

Nouveau sur Brume ? Démarrez par ces deux pages.

- [**Démarrage**](/fr/docs/getting-started/) — installez Brume sur Debian, Fedora ou macOS et vérifiez l'installation.
- [**Votre première pseudonymisation**](/fr/docs/first-pseudonymization/) — écrivez un `brume.yml` minimal, exécutez `brume plan` puis `brume execute`, de bout en bout en cinq minutes.

## Concepts

Le modèle mental derrière l'outil — lisez-les une fois et le reste de la doc prend tout son sens.

- [**Comment fonctionne Brume**](/fr/docs/how-it-works/) — phases d'extraction, transformation, écriture. Déterminisme. Secrets. Traversée des FK.
- [**Stratégies de pseudonymisation**](/fr/docs/strategies/) — `FAKE`, `MASK`, `HASH`, `NULLIFY`, `FPE_ID`, `FPE_UUID`, `KEEP`. Quand choisir laquelle.
- [**Types sémantiques**](/fr/docs/semantic-types/) — `EMAIL`, `PHONE`, `IBAN`… comment `FAKE` et `MASK` les utilisent.

## Référence

La doc exhaustive de chaque flag, chaque clé, chaque variable.

- [**`brume.yml`**](/fr/docs/configuration/) — schéma complet du fichier de configuration.
- [**Commandes CLI**](/fr/docs/cli/) — chaque sous-commande, chaque flag, codes de sortie.
- [**Variables `.env`**](/fr/docs/env/) — secrets, chaînes de connexion, options d'exécution.

## Bien l'utiliser

Usage de niveau production, conformité et dépannage.

- [**Recettes**](/fr/docs/recipes/) — parcours orientés tâches de bout en bout (rafraîchir le staging, multi-tenant, JSONB, CI/CD…).
- [**RGPD & conformité**](/fr/docs/gdpr/) — position juridique, articles RGPD couverts, checklist DPO.
- [**Audit k-anonymat**](/fr/docs/k-anonymity/) — mesurez le risque résiduel de ré-identification.
- [**Exploitation & dépannage**](/fr/docs/operations/) — performance, gestion des secrets, erreurs courantes.

---

**Vous cherchez la Roadmap ?** Voir [Roadmap](/fr/roadmap/). **Besoin d'aide ?** Voir [Support](/fr/support/).
