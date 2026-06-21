---
title: Semantic types
description: The catalogue of types that FAKE and MASK use to generate contextually realistic values.
---

A **type** declares the *semantics* of a column so Brume knows what kind of value to generate. Types apply only to the [`FAKE`](/docs/strategies/#fake) and [`MASK`](/docs/strategies/#mask) strategies — other strategies don't need them.

## Available types

| Type | Strategy | Example output (`FAKE`) | Example output (`MASK`) |
|---|---|---|---|
| `EMAIL` | `FAKE` | `alice.smith@example.com` | `a***@e***.com` |
| `FIRST_NAME` | `FAKE` | `Alice` | `A****` |
| `LAST_NAME` | `FAKE` | `Dupont` | `D*****` |
| `PHONE` | `FAKE` · `MASK` | `+33 6 12 34 56 78` | `+33 6 ** ** ** 78` |
| `ADDRESS` | `FAKE` · `MASK` | `12 rue de la Paix, 75002 Paris` | `** rue ************, 75002 Paris` |
| `IBAN` | `FAKE` · `MASK` | `FR76 3000 6000 0112 3456 7890 189` | `FR76 **** **** **** **** **** 189` |
| `IP_ADDRESS` | `FAKE` · `MASK` | `192.168.1.42` | `192.168.*.*` |
| `JSONB` | `FAKE` | *(delegated to `json_paths`)* | — |

## Notes per type

### `EMAIL`
Generates a syntactically valid email using a fake first name + last name + a safe demonstration TLD. Stable across runs for the same input + secret.

### `FIRST_NAME` · `LAST_NAME`
Picks from the Datafaker dataset matching the system locale, seeded by HMAC. To get cross-table consistency (the same real person → the same fake first name in `users` and `payments`), declare a [`linked_columns`](/docs/configuration/#linked-columns) entry.

### `PHONE`
Generates a phone number in the locale format. `MASK` keeps the international prefix and the last digits, replaces the middle.

### `ADDRESS`
Generates a street, postal code, city. `MASK` keeps the postal code and city, masks the street number and name.

### `IBAN`
Generates a syntactically valid IBAN (correct country code and check digits). `MASK` keeps the country / check / last block, masks the rest.

### `IP_ADDRESS`
Generates an IPv4 address. `MASK` keeps the first two octets (network), masks the last two (host).

### `JSONB`
Special type: indicates that the column is a JSONB document and Brume should delegate to the `json_paths` declaration to anonymize **specific fields** inside the document. See the [JSONB recipe](/docs/recipes/#pseudonymize-jsonb-metadata-columns).

## Choosing a type

Pick the type that **matches the column semantics**, not its Postgres type. A `VARCHAR(255)` storing IBANs needs `type: IBAN`, not "any string".

If your column doesn't fit any semantic type but you still want a deterministic fake string, **prefer `HASH`** — it gives you a stable opaque value without trying to mimic a real format.

## Next

- [**`brume.yml` reference**](/docs/configuration/) — full configuration schema.
- [**Pseudonymization strategies**](/docs/strategies/) — what each strategy does.
