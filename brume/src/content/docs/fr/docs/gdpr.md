---
title: RGPD & conformité
description: La position juridique de Brume, les articles RGPD qu'il implémente ou supporte, et la checklist de validation DPO.
---

Cette page est la référence canonique à partager avec votre **DPO**, votre **conseil juridique** ou votre **équipe sécurité** avant tout déploiement en production.

## Position juridique

Brume produit une **pseudonymisation au sens de l'article 4.5 du RGPD**.

Ce n'est **pas** une anonymisation au sens du Considérant 26. Le dataset cible **reste une donnée à caractère personnel** au sens du RGPD et doit continuer à être traité sous une base juridique valide, avec les mesures techniques et organisationnelles appropriées.

> *« Pseudonymisation »* désigne le traitement de données à caractère personnel de telle façon que celles-ci ne puissent plus être attribuées à une personne concernée précise **sans avoir recours à des informations supplémentaires**, pour autant que ces informations supplémentaires soient conservées séparément et soumises à des mesures techniques et organisationnelles afin de garantir que les données à caractère personnel ne sont pas attribuées à une personne physique identifiée ou identifiable.
> — **RGPD Art. 4.5**

Dans Brume, les *informations supplémentaires* sont précisément la paire `BRUME_HMAC_SECRET` + `BRUME_FPE_KEY`.

## Articles RGPD couverts

| Article | Titre | Ce que Brume fournit | Ce qui reste votre responsabilité |
|---|---|---|---|
| **Art. 4.5** | Définition de la pseudonymisation | Implémente la définition via `FAKE`, `HASH`, `FPE_ID`, `FPE_UUID`, `MASK`, `NULLIFY`. | Garder les secrets *conservés séparément* et protégés. |
| **Art. 5.1(c)** | Minimisation des données | Filtres au niveau ligne + traversée automatique des FK limitée aux données dont vous avez réellement besoin. | Choisir les bons filtres et revoir la sortie de `brume plan`. |
| **Art. 25** | Protection des données dès la conception et par défaut | `brume.yml` déclaratif permet des règles explicites, versionnables, revues par le DPO par colonne. | Inclure le DPO dans la boucle de revue avant chaque exécution. |
| **Art. 32** | Sécurité du traitement | Transformations déterministes, indexées par clé ; supporte TLS vers source et cible. | Exploiter le système de manière sécurisée (transport, stockage, accès). |
| **Art. 89** | Garanties pour la recherche / les statistiques / l'archivage | La pseudonymisation est la garantie canonique recommandée par l'art. 89.1. | Documenter la finalité du traitement dans votre registre. |

## Ce que Brume ne fait *pas*

Soyez honnête sur la limite, votre DPO l'appréciera :

- Brume **n'anonymise pas**. La sortie est réversible avec les secrets.
- Brume **ne classifie pas** quelles colonnes sont des PII. C'est vous qui les déclarez dans `brume.yml`. `brume plan` propose une liste heuristique, mais elle n'est pas exhaustive.
- Brume **ne génère pas** votre registre des traitements (Art. 30) ni votre AIPD (Art. 35). Il produit le dataset pseudonymisé qui les supporte.
- Brume **n'impose pas** de contrôle d'accès sur la cible. Restreignez les destinataires via votre gestion habituelle des rôles de base de données.

## Checklist DPO

Avant d'exécuter Brume sur des données de production :

- Les **secrets** sont stockés dans votre gestionnaire de secrets (Vault, SOPS, AWS Secrets Manager, GitHub Encrypted Secrets…), pas en clair sur disque ou dans git.
- La **source** est accédée avec un compte en lecture seule.
- Le **`brume.yml`** est sous gestion de version et a fait l'objet d'une revue de code.
- **`brume plan`** a été exécuté et sa liste de colonnes PII non couvertes a été revue.
- **`brume dry-run`** se termine sans erreur.
- **`brume audit --anonymity`** a été exécuté sur le dataset résultant — voir [Audit k-anonymat](/fr/docs/k-anonymity/).
- Les **destinataires** du dataset pseudonymisé sont limités au strict minimum (dev, QA, démo).
- **Le dataset n'est pas qualifié d'« anonyme »** dans aucune documentation interne ou communication externe.
- **Une durée de conservation** est fixée sur la copie pseudonymisée.
- Les **logs** de l'exécution sont archivés (utilisez `--json` pour les ingérer dans votre SIEM).

## Pratiques recommandées

- **Faire tourner `BRUME_HMAC_SECRET` et `BRUME_FPE_KEY` sur un calendrier** — et traiter la rotation comme une bascule coordonnée, car elle invalide le déterminisme des sorties passées.
- **Exécuter Brume dans un segment réseau dédié** avec une sortie explicite vers la source et la cible uniquement.
- **Documenter la finalité** de chaque exécution dans votre registre des traitements — l'art. 30 l'attend.

## Citer Brume dans votre registre des traitements

Formulation suggérée (adaptez à votre situation) :

> La pseudonymisation des données à caractère personnel pour utilisation en environnements hors production est réalisée à l'aide de Brume (v\<X.Y.Z\>), implémentant la définition de la pseudonymisation au sens de l'article 4.5 du RGPD. Les informations supplémentaires permettant la ré-identification (`BRUME_HMAC_SECRET`, `BRUME_FPE_KEY`) sont stockées dans `<votre gestionnaire de secrets>` et l'accès en est restreint au `<nom du rôle>`. Le dataset cible est traité comme donnée à caractère personnel et est soumis aux mêmes mesures techniques et organisationnelles que la source.

## Suite

- [**Audit k-anonymat**](/fr/docs/k-anonymity/) — mesurer le risque résiduel de ré-identification.
- [**Exploitation & dépannage**](/fr/docs/operations/) — gestion des secrets, logging, contrôle d'accès.
