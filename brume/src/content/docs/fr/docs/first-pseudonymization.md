---
title: Votre première pseudonymisation
description: Écrivez un brume.yml minimal, exécutez brume plan puis brume execute, et livrez une copie pseudonymisée de votre base de bout en bout.
---

Ce tutoriel vous guide à travers le flux complet de Brume sur un exemple minimal. Vous allez écrire une configuration, l'auditer, puis exécuter la pseudonymisation réelle.

## 1. Configurer les secrets et les connexions

Copiez l'exemple `.env` à côté de votre `brume.yml` :

```bash
cp .env.example .env
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

Voir la [référence `.env`](/fr/docs/env/) pour la liste complète des variables.

## 2. Écrire un `brume.yml` minimal

Commencez avec une seule table — `users` — et pseudonymisez l'email, le téléphone et la clé primaire.

```yaml
extraction:
  fk_depth: 3
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

`plan` est une commande qui estime les volumes de lignes, parcourt les clés étrangères jusqu'à `fk_depth`, et surtout liste les **colonnes PII non couvertes par aucune règle**. Elle n'extrait jamais rien.

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
