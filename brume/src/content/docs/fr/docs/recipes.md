---
title: Recettes
description: Parcours orientés tâches de bout en bout — datasets de debug, rafraîchissement CI/CD, multi-tenant, JSONB, export .sql.
---

Chaque recette est un workflow autonome : un énoncé de problème, la configuration, et les commandes à exécuter. Copiez, adaptez, livrez.

## Générer un dataset de debug depuis la production

**Problème.** Un bug en production référence `orders.id = 982331`. Vous voulez une copie locale qui inclut cette commande, ses `users`, ses `order_items`, et rien d'autre.

**Configuration.**

```yaml
extraction:
  fk_depth: 3
  tables:
    - table: orders
      filter: "id = 982331"

anonymization:
  tables:
    - table: users
      columns:
        - name: id
          strategy: FPE_ID
        - name: email
          strategy: FAKE
          type: EMAIL
```

**Exécution.**

```bash
brume plan       # vérifier ce qui est tiré
brume execute    # livrer vers votre Postgres local
```

Comme `FPE_ID` est déterministe, votre bug à la source `id = 982331` atterrira sur un id cible stable (par ex. `7831`) à chaque fois. Référencez-le avec confiance dans vos notes de debug.

---

## Rafraîchir le staging chaque semaine via CI/CD

**Problème.** Vous voulez que `staging` soit re-pseudonymisé chaque dimanche soir depuis `prod`.

**Prérequis.** Commitez votre `brume.yml` à la racine du dépôt (ou passez un chemin avec `--config`). Le job ci-dessous suppose qu'il est récupéré en même temps que le workflow.

**Exemple GitHub Actions.**

```yaml
# .github/workflows/refresh-staging.yml
name: Refresh staging from prod
on:
  schedule:
    - cron: '0 2 * * 0'  # Dimanche 02:00 UTC
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4   # récupère brume.yml depuis le dépôt
      - name: Install pg_dump
        run: |
          # Faites correspondre la version majeure à votre source prod (ici : Postgres 17)
          sudo apt-get update
          sudo apt-get install -y postgresql-client-17
      - name: Install Brume
        run: |
          curl -1sLf 'https://dl.cloudsmith.io/public/brume/brume/setup.deb.sh' | sudo -E bash
          sudo apt-get install -y brume
      - name: Run Brume
        env:
          BRUME_HMAC_SECRET:    ${{ secrets.BRUME_HMAC_SECRET }}
          BRUME_FPE_KEY:        ${{ secrets.BRUME_FPE_KEY }}
          BRUME_SOURCE_HOST:    ${{ secrets.PROD_HOST }}
          BRUME_SOURCE_PASSWORD: ${{ secrets.PROD_RO_PASSWORD }}
          BRUME_TARGET_HOST:    ${{ secrets.STAGING_HOST }}
          BRUME_TARGET_PASSWORD: ${{ secrets.STAGING_PASSWORD }}
        run: |
          brume diag        # échoue tôt si pg_dump ou la connectivité ne va pas
          brume plan
          brume execute
```

Utilisez `--json` si vous voulez publier des logs structurés comme artefacts.

---

## Pseudonymiser les colonnes metadata JSONB

**Problème.** Votre `users.metadata` est un document JSONB qui contient `contact.email`, `contact.phone` et `shipping.address`. Le reste du document est sûr.

**Configuration.**

```yaml
anonymization:
  tables:
    - table: users
      columns:
        - name: metadata
          strategy: FAKE
          type: JSONB
          json_paths:
            - path: $.contact.email
              type: EMAIL
            - path: $.contact.phone
              type: PHONE
            - path: $.shipping.address
              type: ADDRESS
```

Les autres chemins à l'intérieur de `metadata` sont conservés tels quels. Les chemins qui ne résolvent pas sur une ligne donnée sont ignorés silencieusement — mais `brume dry-run` signalerait un chemin qui ne résout **jamais** sur l'ensemble de la table.

---

## Maintenir la cohérence entre bases de microservices

**Problème.** Votre service `users` stocke `email` ; votre service `audit` stocke `user_email` ; votre service `marketing` stocke `notify_email`. Aucune n'est reliée par une FK. Vous avez besoin que le même email réel atterrisse sur le même faux email dans les trois.

**Configuration.**

```yaml
anonymization:
  linked_columns:
    - semantic_key: user_email
      columns:
        - table: users
          column: email
        - table: audit_logs
          column: user_email
        - table: marketing_subscriptions
          column: notify_email
```

Exécutez Brume indépendamment sur la base de chaque service avec le **même `BRUME_HMAC_SECRET`** — le groupe `linked_columns` garantit une sortie fictive identique.

---

## Exporter vers un fichier `.sql` portable

**Problème.** Votre DPO veut revoir un export pseudonymisé hors ligne avant tout déploiement en production.

**`.env`.**

```bash
BRUME_TARGET_FILE=./out/pseudonymized.sql
BRUME_TARGET_FILE_COMPRESS=gzip
# Les variables Postgres TARGET_* sont ignorées quand TARGET_FILE est définie
```

**Exécution.**

```bash
brume execute
```

Vous obtenez `./out/pseudonymized.sql.gz`. Importez avec :

```bash
gunzip -c pseudonymized.sql.gz | psql -h ... -U ... -d ...
```

---

## Multi-tenant — extraire les données d'un seul tenant

**Problème.** Votre schéma est multi-tenant sur `tenant_id`. Vous voulez ne livrer que le tenant `42`.

**Configuration.**

```yaml
extraction:
  fk_depth: 4
  tables:
    - table: tenants
      filter: "id = 42"
    - table: users
      filter: "tenant_id = 42"
    - table: orders
      filter: "tenant_id = 42"
```

Appliquez le filtre `tenant_id = 42` sur **chaque table racine** du périmètre tenant. La traversée des FK tire automatiquement les dépendants.

---

## Suite

- [**RGPD & conformité**](/fr/docs/gdpr/) — checklist de validation.
- [**Exploitation & dépannage**](/fr/docs/operations/) — performance, gestion des secrets, erreurs courantes.
