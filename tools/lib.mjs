import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_DIR = path.join(ROOT, 'content', 'source');
export const META_DIR = path.join(ROOT, 'content', 'meta');
export const STATUSES = ['draft', 'reviewed', 'approved'];

export async function loadSource() {
  const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.json')).sort();
  const out = {};
  for (const f of files) {
    const ns = f.replace(/\.json$/, '');
    out[ns] = JSON.parse(await readFile(path.join(SOURCE_DIR, f), 'utf8'));
  }
  return out;
}

/** Flatten a nested tree into [dottedPath, value] pairs. */
export function flatten(tree, prefix = '') {
  const rows = [];
  for (const [k, v] of Object.entries(tree)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) rows.push(...flatten(v, p));
    else rows.push([p, v]);
  }
  return rows;
}

export async function loadMeta(ns) {
  try {
    return JSON.parse(await readFile(path.join(META_DIR, `${ns}.json`), 'utf8'));
  } catch {
    return null;
  }
}
