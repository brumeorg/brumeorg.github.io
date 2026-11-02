Before running Brume on production data:

- **Secrets** are stored in your secret manager (Vault, SOPS, AWS Secrets Manager, GitHub Encrypted Secrets…), not in plaintext on disk or in git.
- **Source** is accessed with a read-only account.
- **`brume.yml`** is in version control and has gone through code review.
- **`brume plan`** has been run and its list of uncovered PII columns has been reviewed.
- **`brume dry-run`** completes with zero errors.
- **`brume audit --anonymity`** has been run on the resulting dataset — see [k-Anonymity audit](/docs/k-anonymity/).
- **Recipients** of the pseudonymized dataset are limited to the strict minimum (dev, QA, demo).
- **The dataset is not labelled "anonymous"** in any internal documentation or external communication.
- **A retention period** is set on the pseudonymized copy.
- **Logs** from the run are archived (use `--json` to ingest them in your SIEM).
