#!/usr/bin/env node
// Builds the language packs and writes release tarballs plus SHA-256 checksums into artifacts/.
// The tarballs are what the release workflow attaches to a GitHub Release (no npm account needed).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../lib.mjs';

const ARTIFACTS = path.join(ROOT, 'artifacts');
const PACKAGES = ['id', 'core'];

const run = (args, cwd = ROOT) =>
  execFileSync('pnpm', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

const version = JSON.parse(
  await readFile(path.join(ROOT, 'packages', 'id', 'package.json'), 'utf8'),
).version;

await rm(ARTIFACTS, { recursive: true, force: true });
await mkdir(ARTIFACTS, { recursive: true });

console.log('release: verifying content');
run(['run', 'content:lint']);

console.log('release: building packages');
run(['run', 'build']);

for (const pkg of PACKAGES) {
  console.log(`release: packing @candra/${pkg}`);
  run(['pack', '--pack-destination', ARTIFACTS], path.join(ROOT, 'packages', pkg));
}

const tarballs = (await readdir(ARTIFACTS)).filter((f) => f.endsWith('.tgz')).sort();
const sums = [];
for (const file of tarballs) {
  const hash = createHash('sha256').update(await readFile(path.join(ARTIFACTS, file))).digest('hex');
  sums.push(`${hash}  ${file}`);
}
await writeFile(path.join(ARTIFACTS, 'SHA256SUMS.txt'), sums.join('\n') + '\n');

const tag = `v${version}`;
const base = process.env.RELEASE_URL_BASE ?? 'https://github.com/<org>/<repo>/releases/download';
console.log(`\nrelease: ${tarballs.length} tarball(s) in artifacts/ (tag ${tag})`);
for (const file of tarballs) console.log(`  ${file}`);
console.log('\nInstall from the release (Opsi A):');
for (const file of tarballs) console.log(`  pnpm add ${base}/${tag}/${file}`);
console.log(`\nSet RELEASE_URL_BASE to your repo URL, e.g.`);
console.log(`  RELEASE_URL_BASE=https://github.com/you/candra/releases/download pnpm release:pack`);
