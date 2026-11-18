#!/usr/bin/env node
// Automated style-guide checks (spec section 7.5). Exit code 1 on any error.
//   --release  additionally requires every key to be `approved` (stable releases)
import { loadSource, flatten, loadMeta, STATUSES } from '../lib.mjs';

const release = process.argv.includes('--release');
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const SEGMENT = /^[a-z][a-zA-Z0-9]*$/;
const PLACEHOLDER = /\{([^{}]*)\}/g;
const MAX_DEPTH = 3;
const REGISTER = /\b(kamu|lo|lu|elo|elu|gue|gua|bro|sis)\b/i;
const GLOSSARY_AVOID = [
  [/\bpassword\b/i, 'gunakan “kata sandi”'],
  [/\blog ?in\b/i, 'gunakan “masuk”'],
  [/\blog ?out\b/i, 'gunakan “keluar”'],
  [/\bsign ?up\b/i, 'gunakan “daftar”'],
  [/\bdownload\b/i, 'gunakan “unduh”'],
  [/\bupload\b/i, 'gunakan “unggah”'],
  [/\bcart\b/i, 'gunakan “keranjang”'],
  [/\bfile\b/i, 'gunakan “berkas”'],
  [/\bsurel\b/i, 'gunakan “email” (lihat glosarium)'],
];

const source = await loadSource();
let keyCount = 0;

for (const [ns, tree] of Object.entries(source)) {
  if (!SEGMENT.test(ns)) err(ns, 'nama namespace harus lowerCamelCase');
  const rows = flatten(tree);
  const meta = await loadMeta(ns);
  if (!meta) err(ns, 'berkas content/meta tidak ada (jalankan: pnpm content:meta)');
  const seen = new Set();

  for (const [key, value] of rows) {
    keyCount++;
    const where = `${ns}.${key}`;
    seen.add(key);
    const segs = key.split('.');
    if (segs.length > MAX_DEPTH) err(where, `kedalaman ${segs.length} melebihi maksimum ${MAX_DEPTH}`);
    for (const s of segs) if (!SEGMENT.test(s)) err(where, `segmen kunci “${s}” harus lowerCamelCase (huruf pertama kecil)`);

    if (typeof value !== 'string') { err(where, 'nilai harus berupa string'); continue; }
    if (value.length === 0) err(where, 'nilai kosong');
    if (value !== value.trim()) err(where, 'spasi di awal atau akhir');
    if (/ {2,}/.test(value)) err(where, 'spasi ganda');
    if (/[\n\r\t]/.test(value)) err(where, 'karakter kontrol tidak diizinkan');
    if (/['"]/.test(value)) err(where, "tanda kutip lurus ' atau \" dilarang (apostrof bermakna khusus di ICU); gunakan ’ “ ”");
    if (/<[^>]+>/.test(value)) err(where, 'markup HTML tidak diizinkan di dalam pesan');

    for (const m of value.matchAll(PLACEHOLDER)) {
      if (!SEGMENT.test(m[1])) err(where, `nama placeholder “{${m[1]}}” harus lowerCamelCase`);
    }
    if (/[{}]/.test(value.replace(PLACEHOLDER, ''))) err(where, 'kurung kurawal tidak berpasangan');

    if (REGISTER.test(value)) err(where, 'register informal terdeteksi; standar pack adalah “Anda”');
    for (const [re, hint] of GLOSSARY_AVOID) if (re.test(value)) err(where, `istilah di luar glosarium: ${hint}`);

    if (meta) {
      const st = meta[key];
      if (st === undefined) err(where, 'status tinjauan tidak ada di content/meta');
      else if (!STATUSES.includes(st)) err(where, `status “${st}” tidak valid`);
      else if (release && st !== 'approved') err(where, `rilis stabil membutuhkan status approved (saat ini: ${st})`);
    }
  }
  if (meta) for (const k of Object.keys(meta)) if (!seen.has(k)) err(`${ns}.${k}`, 'entri meta yatim (kunci tidak ada di sumber)');
}

if (errors.length) {
  console.error(errors.map((e) => '✖ ' + e).join('\n'));
  console.error(`\nlint-pack: ${errors.length} masalah ditemukan`);
  process.exit(1);
}
console.log(`lint-pack: OK (${Object.keys(source).length} namespace, ${keyCount} kunci${release ? ', mode rilis' : ''})`);
