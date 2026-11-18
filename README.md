# Candra

Indonesian language, one install away. See the product and technical specification (v1.1) for the full design.

**Status:** Phase 0 scaffold + Phase 1 start. Nothing is published yet.

| Package | Role |
|---|---|
| `@candra/id` | **Primary.** Curated Indonesian messages, i18next / next-intl outputs, `Intl` formatting, typed keys |
| `@candra/core` | Optional dependency-free engine (lookup, nested keys, fallback, interpolation) |

## Using the pack

```ts
// next-intl: messages are plain ICU-compatible objects, namespaces at the top level
import { messages } from '@candra/id/messages';

// i18next: same content, {{placeholder}} syntax, no extra config
import { resources, defaultNS } from '@candra/id/i18next';

// optional engine, fully typed keys + placeholder values
import { createTranslator } from '@candra/core';
const t = createTranslator({ locale: 'id', messages });
t('validation.minLength', { min: 8 });

// formatting
import { formatCurrency, formatRelativeTime } from '@candra/id/format';
formatCurrency(1500000); // "Rp 1.500.000"

// brand-voice overrides, type-checked against the pack
import { defineOverrides, mergeMessages } from '@candra/id';
```

## Install without npm (preview tarballs)

Nothing is on npm yet, so preview builds ship as GitHub Release assets:

```bash
pnpm release:pack     # → artifacts/*.tgz + SHA256SUMS.txt
pnpm release:smoke    # installs them in a temp project and checks the public API
```

Pushing a `v*` tag runs `.github/workflows/release.yml`, which verifies, packs and attaches both
tarballs to the Release. Consumers install straight from the release URL:

```bash
pnpm add https://github.com/nzfna/candra/releases/download/v0.1.0/candra-id-0.1.0.tgz
pnpm add https://github.com/nzfna/candra/releases/download/v0.1.0/candra-core-0.1.0.tgz
```

`SHA256SUMS.txt` lets consumers pin the downloaded files by digest.

## Workflow

```
content/source/*.json   canonical wording (edit here only)
content/meta/*.json     review status per key: draft | reviewed | approved
content/glossary.md     term decisions

pnpm content:lint       style-guide checks (register, glossary, placeholders, ICU-safe quotes)
pnpm content:build      generate messages/, i18next/ and typed src/generated/
pnpm build | typecheck | test
pnpm content:lint:release   stable releases require every key `approved`
```

Generated outputs (`packages/id/messages`, `i18next`, `src/generated`) are git-ignored and rebuilt by `pnpm build`.

## What's next: npm (Opsi B)

`.github/workflows/publish-npm.yml` is manual-only and defaults to `--dry-run`. Before a real publish:

1. Fill `repository` in both `packages/*/package.json` — npm provenance requires it to match the source repo.
2. Own the `@candra` scope on npm, or rename the scope.
3. Configure a Trusted Publisher for the workflow (or store an `NPM_TOKEN` secret).
4. Create the `npm` GitHub environment with a required reviewer.
5. Switch the workflow to `pnpm content:lint:release` once every key is `approved`.

## Not in this repository yet (deferred by design)

`apps/api`, `apps/dashboard`, database, auth and all SaaS infrastructure, until the validation gate in the spec passes.
