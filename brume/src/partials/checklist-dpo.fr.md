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
