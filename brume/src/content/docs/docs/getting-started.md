---
title: Getting started
description: Install Brume on your machine and verify the install in under two minutes.
---

Brume is distributed as a native CLI through the standard package managers for **Debian/Ubuntu**, **Fedora/CentOS** and **macOS**.

## Prerequisites

- **PostgreSQL 14, 15, 16, 17 or 18** on the source database
- A **target** PostgreSQL instance *or* a writable directory for `.sql` output
- A **read-only account** on the source database (recommended for safety)

:::tip[Why read-only?]
Brume never writes back to the source. Using a read-only account is your last-line defense against a typo in your config or a misrouted connection string.
:::

## Install on Debian / Ubuntu

```bash
# 1. Configure the repo (one time only)
curl -1sLf 'https://dl.cloudsmith.io/public/brume/brume/setup.deb.sh' | sudo -E bash

# 2. Install
sudo apt-get install brume

# Updates afterwards
sudo apt-get update && sudo apt-get upgrade brume
```

## Install on Fedora / CentOS

```bash
# 1. Configure the repo (one time only)
curl -1sLf 'https://dl.cloudsmith.io/public/brume/brume/setup.rpm.sh' | sudo -E bash

# 2. Install
sudo dnf install brume
```

## Install on macOS

```bash
# 1. Configure the tap (one time only)
brew tap brumeorg/brume
brew trust --formula brumeorg/brume/brume

# 2. Install
brew install brume

# Updates afterwards
brew upgrade brume
```

## Verify the install

```bash
brume --help
```

You should see the list of available subcommands (`plan`, `execute`, `dry-run`, `audit`, `diag`). If the command is not found, check that your shell's `PATH` was reloaded.

## Next step

Now write your first configuration and run a pseudonymization end-to-end.

→ [**Your first pseudonymization**](/docs/first-pseudonymization/)
