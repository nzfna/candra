#!/usr/bin/env node
// Runs inside a workspace package on `pnpm pack` / `npm publish`:
// ships the root LICENSE file and refuses to package a build that does not exist yet.
import { access, copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../lib.mjs';

const cwd = process.cwd();
const { name } = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'));

await copyFile(path.join(ROOT, 'LICENSE'), path.join(cwd, 'LICENSE'));

try {
  await access(path.join(cwd, 'dist', 'index.js'));
} catch {
  console.error(`prepack: ${name} has no dist/. Run "pnpm build" before packing or publishing.`);
  process.exit(1);
}

console.log(`prepack: ${name} ok (LICENSE copied, dist present)`);
