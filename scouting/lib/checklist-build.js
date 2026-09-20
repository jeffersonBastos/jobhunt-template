#!/usr/bin/env node
// Regenerates only the `known_stack` block in config/checklist.yaml from the
// jobhunt resume pivots' skills[] frontmatter. deal_breakers / nice_to_have /
// soft_signals are hand-authored elsewhere in the same file and left alone —
// see the comment at the top of checklist.yaml.
//
//   node lib/checklist-build.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBHUNT_ROOT = path.join(__dirname, '..', '..');
const CHECKLIST_PATH = path.join(__dirname, '..', 'config', 'checklist.yaml');

function readFrontmatter(mdPath) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  return m ? yaml.load(m[1]) || {} : {};
}

function collectKnownStack() {
  const sources = [
    path.join(JOBHUNT_ROOT, 'resumes', 'web2', 'en.md'),
    path.join(JOBHUNT_ROOT, 'resumes', 'web3', 'en.md'),
  ];
  const byGroup = new Map(); // first pivot to mention a group wins (they're near-duplicates)
  for (const src of sources) {
    if (!fs.existsSync(src)) continue;
    const fm = readFrontmatter(src);
    for (const { group, items } of fm.skills || []) {
      if (!byGroup.has(group)) byGroup.set(group, items);
    }
  }
  return [...byGroup.entries()].map(([group, items]) => `${group}: ${items}`.replace(/\s+/g, ' ').trim());
}

function main() {
  const known = collectKnownStack();
  if (known.length === 0) {
    console.error('no skills[] found in resumes/web2/en.md or resumes/web3/en.md — aborting, leaving checklist.yaml untouched');
    process.exit(1);
  }

  const block = known.map((line) => `  - ${line}`).join('\n');
  const raw = fs.readFileSync(CHECKLIST_PATH, 'utf8');
  const marker = /(# --- BEGIN AUTO-GENERATED \(checklist-build\.js\) ---\nknown_stack:\n)[\s\S]*?(\n# --- END AUTO-GENERATED ---)/;
  if (!marker.test(raw)) {
    console.error('could not find the AUTO-GENERATED markers in checklist.yaml — aborting');
    process.exit(1);
  }

  fs.writeFileSync(CHECKLIST_PATH, raw.replace(marker, `$1${block}$2`));
  console.log(`Regenerated known_stack (${known.length} groups) in config/checklist.yaml`);
}

main();
