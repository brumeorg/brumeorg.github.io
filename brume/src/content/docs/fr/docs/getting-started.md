---
title: Démarrage
description: Installez Brume sur votre machine et vérifiez l'installation en moins de deux minutes.
---

Brume est distribué comme une CLI native via les gestionnaires de paquets standard pour **Debian/Ubuntu**, **Fedora/CentOS** et **macOS**.

## Prérequis

- **PostgreSQL 14, 15, 16, 17 ou 18** sur la base source
- Une instance PostgreSQL **cible** *ou* un répertoire en écriture pour la sortie `.sql`
- Un **compte en lecture seule** sur la base source (recommandé pour la sécurité)

:::tip[Pourquoi en lecture seule ?]
Brume n'écrit jamais sur la source. Utiliser un compte en lecture seule est votre dernière ligne de défense contre une coquille dans votre config ou une chaîne de connexion mal routée.
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

## Installation sur Fedora / CentOS

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

Brume délègue à `pg_dump` la réplication du schéma source. Le binaire doit être sur le `PATH` et **sa version majeure doit correspondre à celle de la source** — par exemple pour Postgres 17, installez `postgresql-client-17`.

```bash
# Debian / Ubuntu
sudo apt-get install postgresql-client-17

# Fedora / CentOS
sudo dnf install postgresql17

# macOS
brew install libpq
brew link --force libpq
```

Remplacez `17` par la version majeure de votre source. Lancez `brume diag` après l'installation pour vérifier que les versions correspondent.

## Vérifier l'installation

```bash
brume --help
```

Vous devriez voir la liste des sous-commandes disponibles (`plan`, `execute`, `dry-run`, `audit`, `diag`). Si la commande est introuvable, vérifiez que le `PATH` de votre shell a bien été rechargé.

## Étape suivante

Écrivez maintenant votre première configuration et exécutez une pseudonymisation de bout en bout.

→ [**Votre première pseudonymisation**](/fr/docs/first-pseudonymization/)
