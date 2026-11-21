---
title: Démarrage
description: Installez Brume sur votre machine et vérifiez l'installation en moins de deux minutes.
---

Brume est distribué comme une CLI native via les gestionnaires de paquets standard pour **Debian/Ubuntu**, **RHEL/Rocky/Alma/Fedora** et **macOS**.

## Prérequis

- **Linux x86_64 avec glibc 2.28 ou plus récente** — RHEL, Rocky, Alma et Oracle Linux 8+, Fedora, Debian 11+, Ubuntu 20.04+ — ou **macOS sur Apple Silicon**
- **PostgreSQL 12, 13, 14, 15, 16, 17 ou 18** sur la base source
- Une instance PostgreSQL **cible** *ou* un répertoire en écriture pour la sortie `.sql`
- Un **compte en lecture seule** sur la base source (recommandé pour la sécurité)

:::tip[Pourquoi en lecture seule ?]
Brume n'écrit jamais sur la source. Utiliser un compte en lecture seule est votre dernière ligne de défense contre une coquille dans votre config ou une chaîne de connexion mal routée.
:::

:::note[Changé en 2.3]
Le binaire Linux démarre désormais avec glibc 2.28. Celui de la 2.2 exigeait glibc 2.34 : sur RHEL 8, Rocky / Alma 8, Debian 11 ou Ubuntu 20.04, il s'installait puis s'arrêtait au lancement sur ``version `GLIBC_2.34' not found`` — passez à la 2.3. Avant publication, chaque version est maintenant installée et lancée sur RHEL 8 / 9, Debian 11 / 13 et Ubuntu 20.04 / 24.04. Amazon Linux 2 et CentOS 7, dont la glibc est plus ancienne, ne sont pas supportés.
:::

## Installation sur Debian / Ubuntu

```bash
# 1. Configurer le dépôt (une seule fois)
curl -1sLf 'https://dl.cloudsmith.io/public/brume/brume/setup.deb.sh' | sudo -E bash

# 2. Installer
sudo apt-get install brume

# Mises à jour ultérieures
sudo apt-get update && sudo apt-get upgrade brume
```

## Installation sur RHEL / Rocky / Alma / Fedora

```bash
# 1. Configurer le dépôt (une seule fois)
curl -1sLf 'https://dl.cloudsmith.io/public/brume/brume/setup.rpm.sh' | sudo -E bash

# 2. Installer
sudo dnf install brume
```

## Installation sur macOS

```bash
# 1. Configurer le tap (une seule fois)
brew tap brumeorg/brume
brew trust --formula brumeorg/brume/brume

# 2. Installer
brew install brume

# Mises à jour ultérieures
brew upgrade brume
```

## Installer `pg_dump`

Brume délègue à `pg_dump` la réplication du schéma source. Le binaire doit être sur le `PATH` et **sa version majeure doit être supérieure ou égale à celle de la source**. **`pg_dump` 18 est recommandé** : un seul client lit toutes les sources supportées, de PostgreSQL 12 à 18.

```bash
# Debian / Ubuntu
sudo apt-get install postgresql-client-18

# RHEL / Rocky / Alma / Fedora
sudo dnf install postgresql18

# macOS
brew install libpq
brew link --force libpq
```

Si votre distribution ne fournit pas la version 18, ces paquets viennent du [dépôt PostgreSQL](https://www.postgresql.org/download/linux/). `brume execute` vérifie la version de `pg_dump` par rapport à la source avant de copier quoi que ce soit, et `brume init` affiche la commande d'installation pour votre système quand `pg_dump` est absent ou antérieur à la 18.

## Vérifier l'installation

```bash
brume --help
```

Vous devriez voir la liste des sous-commandes disponibles (`init`, `scan`, `plan`, `dry-run`, `execute`, `audit`, `diag`). Si la commande est introuvable, vérifiez que le `PATH` de votre shell a bien été rechargé. `brume --version` affiche la version installée.

## Étape suivante

Écrivez maintenant votre première configuration et exécutez une pseudonymisation de bout en bout.

→ [**Votre première pseudonymisation**](/fr/docs/first-pseudonymization/)

:::tip[Ça a fonctionné ?]
- [Mettre une étoile sur GitHub](https://github.com/brumeorg/Brume)
- [Signaler un problème sur GitHub](https://github.com/brumeorg/Brume/issues)
- [Déployer pour plusieurs équipes, avec support : offre Enterprise](/fr/enterprise/)
:::
