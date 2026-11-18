#!/usr/bin/env node
// Installs the tarballs from artifacts/ into a throwaway project and asserts the public API works.
// Run after `pnpm release:pack`; the release workflow runs it before uploading anything.
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT } from '../lib.mjs';

const ARTIFACTS = path.join(ROOT, 'artifacts');
const tarballs = (await readdir(ARTIFACTS).catch(() => []))
  .filter((f) => f.endsWith('.tgz'))
  .map((f) => path.join(ARTIFACTS, f));

if (!tarballs.length) {
  console.error('release:smoke: no tarballs found — run `pnpm release:pack` first');
  process.exit(1);
}

const SCRIPT = [
  "import { messages } from '@candra/id/messages';",
  "import { resources, defaultNS } from '@candra/id/i18next';",
  "import { formatCurrency, formatRelativeTime } from '@candra/id/format';",
  "import { createTranslator } from '@candra/core';",
  'const t = createTranslator({ locale: "id", messages });',
  "console.log(JSON.stringify({",
  '  save: t("common.actions.save"),',
  '  minLength: t("validation.minLength", { min: 8 }),',
  "  i18next: resources.id.validation.minLength,",
  "  ns: defaultNS,",
  "  currency: formatCurrency(1500000),",
  "  relative: formatRelativeTime(Date.now() - 3 * 864e5),",
  "}));",
].join('\n');

const EXPECTED = {
  save: 'Simpan',
  minLength: 'Minimal 8 karakter',
  i18next: 'Minimal {{min}} karakter',
  ns: 'common',
  currency: 'Rp 1.500.000',
  relative: '3 hari yang lalu',
};

const dir = await mkdtemp(path.join(tmpdir(), 'candra-smoke-'));
const pnpm = (args) =>
  execFileSync('pnpm', args, { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });

try {
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'candra-smoke', private: true, type: 'module' }, null, 2),
  );
  pnpm(['add', ...tarballs]);
  await writeFile(path.join(dir, 'smoke.mjs'), SCRIPT);

  const actual = JSON.parse(execFileSync(process.execPath, ['smoke.mjs'], { cwd: dir, encoding: 'utf8' }));
  // Intl emits non-breaking spaces (U+00A0 / U+202F) in currency output; compare normalised.
  const norm = (v) => String(v).replace(/[\u00a0\u202f]/g, ' ');
  const failures = Object.entries(EXPECTED).filter(([k, v]) => norm(actual[k]) !== norm(v));

  if (failures.length) {
    for (const [k, v] of failures) console.error(`release:smoke: ${k} expected ${JSON.stringify(v)}, got ${JSON.stringify(actual[k])}`);
    process.exit(1);
  }
  console.log(`release:smoke: OK (${tarballs.length} tarball(s), ${Object.keys(EXPECTED).length} checks)`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
