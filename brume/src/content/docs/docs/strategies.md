---
title: Pseudonymization strategies
description: The seven strategies Brume can apply per column — FAKE, MASK, HASH, NULLIFY, FPE_ID, FPE_UUID, KEEP.
---

A **strategy** defines *how a real value is transformed* before being written to the target. It is declared at the column level in `brume.yml`.

## At a glance

| Strategy | Reversible? | Joinable? | Format-preserving? | Requires `type` |
|---|---|---|---|---|
| [`FAKE`](#fake) | No | Yes (deterministic) | No | **Yes** |
| [`MASK`](#mask) | No | No | Yes | **Yes** |
| [`HASH`](#hash) | No | Yes | No (fixed 64 chars) | No |
| [`NULLIFY`](#nullify) | N/A | No | N/A | No |
| [`FPE_ID`](#fpe_id) | Yes (with key) | Yes | Yes | No |
| [`FPE_UUID`](#fpe_uuid) | Yes (with key) | Yes | Yes (UUID → UUID) | No |
| [`KEEP`](#keep) | N/A | N/A | N/A | No |

## `FAKE`

Replaces the value with a **realistic synthetic value** generated via Datafaker, seeded by HMAC of the original. Deterministic: the same source value always produces the same fake.

```yaml
- name: email
  strategy: FAKE
  type: EMAIL
```

**Use it for** display-grade PII that needs to look real in screenshots, demos, integration tests where downstream code parses the value (e.g. email validation).

## `MASK`

**Partial masking** that preserves the field's structure. Keeps a prefix or suffix depending on the type, replaces the rest with `*`.

```yaml
- name: phone
  strategy: MASK
  type: PHONE
```

**Use it for** support / log-readable values where you want operators to recognize the *shape* of the data (last 4 digits of a card, first letters of a name) without seeing the full value.

## `HASH`

One-way **HMAC-SHA256** keyed with `BRUME_HMAC_SECRET`. Produces a 64-character hex string. Deterministic, non-reversible.

```yaml
- name: external_user_id
  strategy: HASH
```

**Use it for** opaque identifiers you need to join on across tables but never need to display or reverse. The output is always 64 chars — if the column has a `VARCHAR(N)` constraint smaller than that, prefer `FPE_ID` or `FPE_UUID`.

## `NULLIFY`

Replaces the value with **`NULL`**. The column must be nullable in the target schema.

```yaml
- name: free_text_notes
  strategy: NULLIFY
```

**Use it for** free-text or comment fields where users might paste PII that no strategy can safely sanitize. The strongest minimization possible.

## `FPE_ID`

**Format-preserving encryption** (FF1 / BouncyCastle) for **numeric identifiers**. Integer input → integer output of the same length. Keyed by `BRUME_FPE_KEY`.

```yaml
- name: id
  strategy: FPE_ID
```

**Use it for** numeric primary keys. Brume **automatically propagates** the encryption to every foreign key pointing to this PK, so referential integrity holds end-to-end.

## `FPE_UUID`

UUID-to-UUID deterministic pseudonymization. Preserves the `8-4-4-4-12` format, uniqueness, and FK relationships.

```yaml
- name: id
  strategy: FPE_UUID
```

**Use it for** UUID primary keys. Same automatic FK propagation as `FPE_ID`.

## `KEEP`

Copies the value **without modification**. This is the **default behavior** for any column not declared in `brume.yml`.

```yaml
- name: country_code
  strategy: KEEP
```

**Use it for** non-sensitive columns (lookups, enums, timestamps) — though usually you just leave them undeclared.

## Decision table — which strategy when?

| Your column is… | Pick |
|---|---|
| A numeric PK / FK | `FPE_ID` |
| A UUID PK / FK | `FPE_UUID` |
| An email / name / phone / address you need to display | `FAKE` (+ matching `type`) |
| A phone / card / ID where the *shape* matters but the content doesn't | `MASK` (+ matching `type`) |
| An opaque key you join on but never display | `HASH` |
| A free-text comment / notes field | `NULLIFY` |
| A safe enum / timestamp / boolean | leave undeclared (= `KEEP`) |

## Next

- [**Semantic types**](/docs/semantic-types/) — the values `FAKE` and `MASK` need.
- [**`brume.yml` reference**](/docs/configuration/) — the full configuration schema.
