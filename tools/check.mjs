#!/usr/bin/env node
// Static checks run by CI (and locally with `node tools/check.mjs`):
// - the game script in index.html and the tools parse as JavaScript
// - the radio dialog block is valid JSON with well-formed entries
// - every radio line used by the game exists in the dialog block
// - every dialog line has its voice file in voices/
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const nodeCheck = (file, label) => {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    errors.push(`${label} does not parse:\n${e.stderr.toString().trim()}`);
  }
};

const html = readFileSync(join(root, 'index.html'), 'utf8');

// 1. JavaScript syntax
const game = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!game) errors.push('index.html: game module script not found');
else {
  const dir = mkdtempSync(join(tmpdir(), 'stardog-check-'));
  const file = join(dir, 'game.mjs');
  writeFileSync(file, game[1]);
  nodeCheck(file, 'index.html game script');
  rmSync(dir, { recursive: true });
}
for (const tool of ['tools/make-voices.mjs', 'tools/check.mjs']) nodeCheck(join(root, tool), tool);

// 2. Dialog block
let dialog = {};
const block = html.match(/<script type="application\/json" id="dialog">([\s\S]*?)<\/script>/);
if (!block) errors.push('index.html: dialog block not found');
else {
  try {
    dialog = JSON.parse(block[1]);
  } catch (e) {
    errors.push(`dialog block is not valid JSON: ${e.message}`);
  }
}
for (const [id, entry] of Object.entries(dialog)) {
  const ok = Array.isArray(entry) && (entry.length === 2 || entry.length === 3) && entry.every((v) => typeof v === 'string');
  if (!ok) errors.push(`dialog "${id}": expected [speaker, subtitle, optional speech text]`);
}

// 3. Lines used by the game: comm('id'), say('id', ...), intro: [...], win: [...]
const used = new Set();
const code = game ? game[1] : '';
for (const m of code.matchAll(/\b(?:comm|say)\(([^)]*)\)/g)) for (const q of m[1].matchAll(/'([a-z0-9_]+)'/g)) used.add(q[1]);
for (const m of code.matchAll(/\b(?:intro|win): \[([^\]]*)\]/g)) for (const q of m[1].matchAll(/'([a-z0-9_]+)'/g)) used.add(q[1]);
for (const id of used) if (!(id in dialog)) errors.push(`radio line "${id}" is used by the game but missing from the dialog block`);

// 4. Voice files
for (const id of Object.keys(dialog)) {
  if (!existsSync(join(root, 'voices', `${id}.m4a`))) errors.push(`voices/${id}.m4a is missing (run node tools/make-voices.mjs)`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ scripts parse, ${Object.keys(dialog).length} radio lines (${used.size} referenced by the game), all voice files present`);
