#!/usr/bin/env node
// Render a resume markdown file to PDF using a fixed HTML/CSS template + headless Chrome.
//
//   node build.js <resume.md> [out.pdf] [--ats]
//
// The markdown file has YAML frontmatter (header, contact, skills, education,
// languages, section labels) and a markdown body (the EXPERIENCE section).
// Design lives entirely in resume.css — edit that to tune the look.
//
// OUTPUT NAMING — omit [out.pdf] and you get the send-ready filename directly,
// no manual renaming before emailing/uploading. From <pivot>/<lang>.md, using
// your `slug` from build/config.yaml (copy build/config.example.yaml first):
//
//   designed   → resumes/<pivot>/<slug>-<word>-<n>.pdf
//   --ats      → resumes-ats/<slug>-<word>-<n>-ats.pdf
//
// <word> is the language: "resume" for en, "cv" for pt. <n> is the pivot
// number from `pivot_numbers` in build/config.yaml (defaults: web2 → 2,
// web3-ai → 3). So with slug "your-name", resumes/web2/en.md gives
// your-name-resume-2.pdf and your-name-resume-2-ats.pdf.
// A pivot with no number mapped falls back to its folder name, which is what
// application tailors under applications/<company-role>/ get; those keep both
// variants next to the source file.
// Pass an explicit [out.pdf] to override for a one-off.
//
// LAYOUT — frontmatter `layout: sidebar-contact` moves the contact block into
// the sidebar above EDUCATION/LANGUAGES and gives the summary the full page
// width. Omit the key for the original header-contact layout. Only the designed
// PDF is affected; the ATS variant is single-column and ignores it.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const ATS = argv.includes('--ats'); // single-column, parse-friendly variant for ATS uploads
const positional = argv.filter((a) => !a.startsWith('--'));
const input = positional[0];
if (!input) {
  console.error('usage: node build.js <resume.md> [out.pdf] [--ats]');
  process.exit(1);
}

const raw = fs.readFileSync(input, 'utf8');
const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
if (!fm) {
  console.error('error: file is missing YAML frontmatter (--- ... ---)');
  process.exit(1);
}
const data = yaml.load(fm[1]) || {};
const body = fm[2].trim();

const L = Object.assign(
  {
    skills: 'SKILLS',
    education: 'EDUCATION',
    languages: 'LANGUAGES',
    experience: 'EXPERIENCE',
    selectedwork: 'SELECTED WORK',
    contact: 'CONTACT',
  },
  data.sections || {},
);

// --- layout ------------------------------------------------------------------
// "sidebar-contact" moves the contact block out of the header and stacks it on
// top of EDUCATION/LANGUAGES in the sidebar, which frees the full page width for
// the summary. Opt in per resume with `layout: sidebar-contact` in frontmatter;
// anything else keeps the original header-contact layout. The ATS variant is
// single-column and has no sidebar, so it ignores this entirely.
const SIDEBAR_CONTACT = !ATS && data.layout === 'sidebar-contact';

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// --- contact block -----------------------------------------------------------
const c = data.contact || {};
const contact = [];
if (c.email) contact.push(`<div class="crow">✉️ <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>`);
if (c.phone) contact.push(`<div class="crow">📞 ${esc(c.phone)}</div>`);
if (c.linkedin) {
  const url = typeof c.linkedin === 'object' ? c.linkedin.url : `https://www.linkedin.com/${c.linkedin}`;
  const label = typeof c.linkedin === 'object' ? c.linkedin.label : c.linkedin;
  contact.push(`<div class="crow"><span class="in">in</span> <a href="${esc(url)}">${esc(label)}</a></div>`);
}
if (c.github) {
  const g = String(c.github);
  contact.push(`<div class="crow"><span class="gh">gh</span> <a href="${esc(g.startsWith('http') ? g : 'https://' + g)}">${esc(g.replace(/^https?:\/\//, ''))}</a></div>`);
}
if (c.location) contact.push(`<div class="crow">🌐 ${esc(c.location)}</div>`);

// --- sidebar blocks ----------------------------------------------------------
const skills = (data.skills || [])
  .map((s) => `<div class="skill"><div class="skill-group">${esc(s.group)}:</div><div class="skill-items">${esc(s.items)}</div></div>`)
  .join('\n');

const education = (data.education || [])
  .map((e) => `<div class="edu"><div class="edu-school">${esc(e.school)}</div><div class="edu-period">${esc(e.period)}</div><div class="edu-degree">${esc(e.degree)}</div></div>`)
  .join('\n');

const languages = data.languages ? `<div class="lang">${esc(data.languages).replace(/\n/g, '<br>')}</div>` : '';

// --- experience (markdown body) ---------------------------------------------
const experience = marked.parse(body);

// --- selected work (optional frontmatter list of markdown lines) ------------
const selectedWork = (data.selected_work || [])
  .map((item) => `<p>${marked.parseInline(typeof item === 'string' ? item : item.text || '')}</p>`)
  .join('\n');

// --- assemble ----------------------------------------------------------------
const css = fs.readFileSync(path.join(__dirname, ATS ? 'resume-ats.css' : 'resume.css'), 'utf8');

// Two-column band (designed variant) vs. a single stacked column (ATS variant).
const sidebar = ATS
  ? `<section class="stack">
  <div class="section">${esc(L.skills)}</div>
  ${skills}
  <div class="section">${esc(L.education)}</div>
  ${education}
  <div class="section">${esc(L.languages)}</div>
  ${languages}
</section>`
  : `<div class="cols">
  <section class="col-main">
    <div class="section">${esc(L.skills)}</div>
    ${skills}
  </section>
  <aside class="col-side">
    ${SIDEBAR_CONTACT ? `<div class="section">${esc(L.contact)}</div>\n    ${contact.join('\n    ')}` : ''}
    <div class="section">${esc(L.education)}</div>
    ${education}
    <div class="section">${esc(L.languages)}</div>
    ${languages}
  </aside>
</div>`;

const fontLinks = ATS
  ? ''
  : `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
${fontLinks}
<style>${css}</style>
</head><body class="${SIDEBAR_CONTACT ? 'layout-sidebar-contact' : 'layout-header-contact'}">
<header class="head">
  <div class="head-left">
    <h1 class="name">${esc(data.name)}</h1>
    ${data.title ? `<p class="role-title">${esc(data.title)}</p>` : ''}
    ${data.summary ? `<p class="summary">${esc(data.summary)}</p>` : ''}
  </div>
  ${SIDEBAR_CONTACT ? '' : `<div class="head-right">${contact.join('\n')}</div>`}
</header>
${sidebar}
<section class="experience">
  <div class="section">${esc(L.experience)}</div>
  ${experience}
</section>
${selectedWork ? `<section class="experience selected-work">
  <div class="section">${esc(L.selectedwork)}</div>
  ${selectedWork}
</section>` : ''}
</body></html>`;

// --- output filename ---------------------------------------------------------
// Send-ready by default: "<slug>-<word>-<n>[-ats].pdf". See the header.
// Reads build/config.yaml for the slug and pivot→number mapping; copy
// build/config.example.yaml to build/config.yaml and fill in your own slug.
const REPO = path.join(__dirname, '..');
const configPath = path.join(__dirname, 'config.yaml');
if (!fs.existsSync(configPath)) {
  console.error(
    `error: ${configPath} not found. Copy build/config.example.yaml to build/config.yaml and fill in your slug.`,
  );
  process.exit(1);
}
const buildConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
const SLUG = buildConfig.slug;
if (!SLUG) {
  console.error('error: build/config.yaml is missing a "slug" value.');
  process.exit(1);
}
const PIVOT_NUMBERS = buildConfig.pivot_numbers || {}; // add a pivot here when one is created
const LANG_WORDS = { en: 'resume', pt: 'cv' };

function defaultOut(src) {
  const abs = path.resolve(src);
  const lang = path.basename(abs, '.md'); // en | pt
  const pivot = path.basename(path.dirname(abs)); // web2 | web3-ai | <company-role>
  const word = LANG_WORDS[lang] || lang;
  const n = PIVOT_NUMBERS[pivot] || pivot;
  const name = [SLUG, word, n, ATS ? 'ats' : null].filter(Boolean).join('-') + '.pdf';
  // Resume pivots keep their ATS variant in the shared resumes-ats/ folder;
  // anything else (application tailors, scratch files) stays next to its source.
  const inResumes = path.dirname(path.dirname(abs)) === path.join(REPO, 'resumes');
  const dir = ATS && inResumes ? path.join(REPO, 'resumes-ats') : path.dirname(abs);
  return path.join(dir, name);
}

const out = path.resolve(positional[1] || defaultOut(input));
fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = path.join(__dirname, '.render.html');
fs.writeFileSync(tmp, html);

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

try {
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--virtual-time-budget=6000',
      `--print-to-pdf=${out}`,
      `file://${tmp}`,
    ],
    { stdio: 'inherit' },
  );
} finally {
  fs.existsSync(tmp) && fs.unlinkSync(tmp);
}
console.log('✓ wrote', out);
