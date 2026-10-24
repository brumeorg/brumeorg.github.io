---
title: Votre première pseudonymisation
description: Écrivez un brume.yml minimal, exécutez brume plan puis brume execute, et livrez une copie pseudonymisée de votre base de bout en bout.
---

Ce tutoriel vous guide à travers le flux complet de Brume sur un exemple minimal. Vous allez écrire une configuration, l'auditer, puis exécuter la pseudonymisation réelle.

## 1. Configurer les secrets et les connexions

Générez un template `.env.brume` à côté de votre `brume.yml`. Choisissez le type de sink qui correspond à votre cible :

```bash
brume init jdbc    # cible = une base Postgres live
# ou
brume init dump    # cible = un fichier .sql
```

Renseignez les deux secrets et les chaînes de connexion source et cible :

```bash
# Secrets — gardez-les en lieu sûr, leur fuite invalide la pseudonymisation
BRUME_HMAC_SECRET=remplacez-moi-par-une-longue-chaine-aleatoire
BRUME_FPE_KEY=remplacez-moi-16ca-min

# Source (compte en lecture seule recommandé)
BRUME_SOURCE_HOST=db.prod.internal
BRUME_SOURCE_PORT=5432
BRUME_SOURCE_DB=app_production
BRUME_SOURCE_USER=brume_reader
BRUME_SOURCE_PASSWORD=...

# Cible — un autre Postgres, ou un répertoire pour la sortie .sql
BRUME_TARGET_HOST=localhost
BRUME_TARGET_PORT=5432
BRUME_TARGET_DB=app_dev
BRUME_TARGET_USER=app
BRUME_TARGET_PASSWORD=...
```

Les deux valeurs `BRUME_*_SECRET` / `BRUME_*_KEY` générées par `brume init` sont des placeholders — Brume 1.6 émet un warning à chaque exécution si elles sont laissées intactes. Remplacez-les par des valeurs à haute entropie avant `brume execute`.

Voir la [référence `.env.brume`](/fr/docs/env/) pour la liste complète des variables.

## 2. Écrire un `brume.yml` minimal

Commencez avec une seule table — `users` — et pseudonymisez l'email, le téléphone et la clé primaire.

```yaml
extraction:
  fk_depth: 1         # rayon FK autour des lignes sélectionnées — commencez petit
  tables:
    - table: users

anonymization:
  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID    # automatiquement propagé aux FK pointant vers users.id
        - name: email
          strategy: FAKE
          type: EMAIL
        - name: phone
          strategy: MASK
          type: PHONE
        - name: notes
          strategy: NULLIFY
```

Voir la [référence `brume.yml`](/fr/docs/configuration/) pour le schéma complet.

## 3. Planifier avant d'exécuter — `brume plan`

`plan` compte les lignes que recevra chaque table dans le rayon `fk_depth` — exactement ce que copiera `execute` — et surtout liste les **colonnes PII non couvertes par aucune règle**. Il n'écrit jamais rien.

```bash
brume plan
```

Lisez attentivement la sortie. Toute colonne signalée comme non couverte sera copiée telle quelle — corrigez la config avant d'aller plus loin.

## 4. Valider la config — `brume dry-run`

`dry-run` exécute le pipeline complet mais n'écrit rien (la cible est un `NullSink`). Il détecte les erreurs de configuration que `plan` ne voit pas — stratégies invalides, types incompatibles sur `FAKE`, chemins JSONB qui ne résolvent pas :

```bash
brume dry-run
```

## 5. Exécuter la pseudonymisation — `brume execute`

Quand `plan` et `dry-run` sont propres, exécutez pour de vrai :

```bash
brume execute
```

Brume copie le sous-ensemble sélectionné, transforme chaque colonne selon vos règles et écrit vers la cible. Deux exécutions avec les mêmes `hmac-secret` + `fpe-key` produisent des **résultats identiques** — votre pipeline est reproductible.

## 6. Et ensuite

- Apprenez [**comment Brume fonctionne en interne**](/fr/docs/how-it-works/) pour vous construire le bon modèle mental.
- Choisissez la bonne [**stratégie par colonne**](/fr/docs/strategies/).
- Lisez les [**recettes**](/fr/docs/recipes/) pour les patterns de production (rafraîchissement CI/CD, multi-tenant, JSONB, export `.sql`).
- Exécutez [**`brume audit --anonymity`**](/fr/docs/k-anonymity/) pour mesurer le risque résiduel de ré-identification pour votre DPO.
