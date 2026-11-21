---
title: Getting started
description: Install Brume on your machine and verify the install in under two minutes.
---

Brume is distributed as a native CLI through the standard package managers for **Debian/Ubuntu**, **RHEL/Rocky/Alma/Fedora** and **macOS**.

## Prerequisites

- **Linux x86_64 with glibc 2.28 or later** — RHEL, Rocky, Alma and Oracle Linux 8+, Fedora, Debian 11+, Ubuntu 20.04+ — or **macOS on Apple Silicon**
- **PostgreSQL 12, 13, 14, 15, 16, 17 or 18** on the source database
- A **target** PostgreSQL instance *or* a writable directory for `.sql` output
- A **read-only account** on the source database (recommended for safety)

:::tip[Why read-only?]
Brume never writes back to the source. Using a read-only account is your last-line defense against a typo in your config or a misrouted connection string.
:::

:::note[Changed in 2.3]
The Linux binary now starts with glibc 2.28. The 2.2 binary needed glibc 2.34: on RHEL 8, Rocky / Alma 8, Debian 11 or Ubuntu 20.04 it installed, then stopped at launch with ``version `GLIBC_2.34' not found`` — upgrade to 2.3. Before it is published, each release is now installed and started on RHEL 8 / 9, Debian 11 / 13 and Ubuntu 20.04 / 24.04. Amazon Linux 2 and CentOS 7, with an older glibc, are not supported.
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

## Install on RHEL / Rocky / Alma / Fedora

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

## Install `pg_dump`

Brume shells out to `pg_dump` to replicate the source schema. The binary must be on `PATH` and **its major version must be greater than or equal to the source's**. **`pg_dump` 18 is recommended**: one client reads every supported source, from PostgreSQL 12 to 18.

```bash
# Debian / Ubuntu
sudo apt-get install postgresql-client-18

# RHEL / Rocky / Alma / Fedora
sudo dnf install postgresql18

# macOS
brew install libpq
brew link --force libpq
```

If your distribution doesn't ship version 18, these packages come from the [PostgreSQL repository](https://www.postgresql.org/download/linux/). `brume execute` checks the `pg_dump` version against the source before copying anything, and `brume init` prints the install command for your system when `pg_dump` is missing or older than 18.

## Verify the install

```bash
brume --help
```

You should see the list of available subcommands (`init`, `scan`, `plan`, `dry-run`, `execute`, `audit`, `diag`). If the command is not found, check that your shell's `PATH` was reloaded. `brume --version` prints the installed version.

## Next step

Now write your first configuration and run a pseudonymization end-to-end.

→ [**Your first pseudonymization**](/docs/first-pseudonymization/)

:::tip[Did it work?]
- [Star the project on GitHub](https://github.com/brumeorg/Brume)
- [Report a problem on GitHub](https://github.com/brumeorg/Brume/issues)
- [Roll out to several teams, with support: Enterprise offer](/enterprise/)
:::
