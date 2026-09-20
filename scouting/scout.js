#!/usr/bin/env node
// Job scout orchestrator — deterministic stages only (fetch, dedup, report).
// Classification (FIT/CLOSE/DISCARD judgment) is deliberately NOT done here:
// it's the one step that needs an LLM's judgment (e.g. telling "Go required"
// apart from "Go is a plus" in free-text requirements), so it's handled by
// whatever agent runs this skill (see .claude/skills/job-scout/SKILL.md),
// using a cheap model. This script never calls a model API directly.
//
//   node scout.js fetch [--site=<key>]        -> writes state/pending.json
//   node scout.js finalize <classifications.json> -> writes report + updates state
//   node scout.js correct <url> <FIT|CLOSE|DISCARD> ["note"] -> fix a past verdict
//   node scout.js status <url> <open|applied|closed> [--company=] [--title=]  -> set status
//   node scout.js apply <url> [--company=] [--title=]  -> shortcut for `status <url> applied`
//                                              (works even for a url never scouted — creates
//                                              a minimal ad-hoc tracking record on the fly)
//   node scout.js sync-report <path>          -> bulk-process a report's checkboxes/annotations
//   node scout.js digest                      -> regenerate the cross-report rollups (see below)
//
// classifications.json shape: [{ id, verdict: "FIT"|"CLOSE"|"DISCARD",
//                                 region: "br"|"intl",
//                                 matched: [...], violated: [...], reason: "" }]
// (one entry per record in state/pending.json, matched by `id`)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { makeId } from './lib/normalize.js';
import {
  loadSeen,
  saveSeen,
  hasSeen,
  markSeen,
  setStatus,
  findSeenByUrl,
  logCorrection,
  loadPending,
  savePending,
  loadFetchMeta,
  saveFetchMeta,
  logFetchError,
  logDiscard,
  logFiltered,
  logNote,
  saveSnapshot,
  loadSnapshot,
} from './lib/dedup.js';
import { writeReport } from './lib/report.js'; // used both for finalize batches and classify:false direct reports
import { inferRegion } from './lib/region.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBHUNT_ROOT = path.join(__dirname, '..'); // scouting/ lives one level inside jobhunt/
const APPLICATIONS_DIR = path.join(JOBHUNT_ROOT, 'applications');

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Promotes a snapshot (saved at finalize time, while full job text still
// exists) into the existing, git-tracked applications/<company-role>/
// folder — the same place tailored resume copies live (see jobhunt's
// base->tailor workflow in CLAUDE.md). Solves postings disappearing from
// the live ATS once a role closes: the description is preserved here.
function writeApplicationSnapshot(found, snapshot) {
  let slug = slugify(`${found.company}-${found.title}`) || found.id;
  let dir = path.join(APPLICATIONS_DIR, slug);
  // Same company+title (e.g. two different "Stripe — Software Engineer"
  // postings) would otherwise collide on this slug and silently overwrite
  // the first application's saved posting text. Disambiguate with the
  // record id instead of clobbering — only if the existing folder is
  // actually a different job (different url in its front matter).
  const existingFile = path.join(dir, 'job-posting.md');
  if (fs.existsSync(existingFile)) {
    const existing = fs.readFileSync(existingFile, 'utf8');
    const sameJob = existing.includes(`url: ${JSON.stringify(found.url)}`);
    if (!sameJob) {
      slug = `${slug}-${found.id}`;
      dir = path.join(APPLICATIONS_DIR, slug);
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const fm = [
    '---',
    `company: ${JSON.stringify(found.company)}`,
    `title: ${JSON.stringify(found.title)}`,
    `url: ${JSON.stringify(found.url)}`,
    `applied_at: ${new Date().toISOString().slice(0, 10)}`,
    snapshot ? `source_verdict: ${snapshot.verdict}` : null,
    '---',
  ]
    .filter(Boolean)
    .join('\n');
  const body = snapshot
    ? `\n\n# ${found.company} — ${found.title}\n\n${snapshot.text}\n`
    : `\n\n# ${found.company} — ${found.title}\n\n(No full-text snapshot available — this posting was classified before snapshotting was added, or the snapshot expired. Only the link is preserved: ${found.url})\n`;
  const filePath = path.join(dir, 'job-posting.md');
  fs.writeFileSync(filePath, fm + body);
  return filePath;
}

// Splits a finalize/fetch batch by `region` ("br"/"intl") and writes one
// reports/<region>/<date>.md per non-empty region (see lib/report.js) —
// falls back to inferRegion(record.location) for any entry missing an
// explicit region tag (classify:false sources, or an older-format
// classifications file). Only regions with at least one record get a new
// section written this run; the other file is left untouched.
function writeReportsByRegion({ date, sitesChecked, entries }) {
  const byRegion = { br: [], intl: [] };
  for (const entry of entries) {
    const region = entry.region === 'br' || entry.region === 'intl' ? entry.region : inferRegion(entry.record.location);
    byRegion[region].push({ ...entry, region });
  }
  const written = [];
  for (const region of ['br', 'intl']) {
    if (!byRegion[region].length) continue;
    written.push(writeReport({ date, sitesChecked, classified: byRegion[region], region }));
  }
  return written;
}

function loadSites() {
  const raw = fs.readFileSync(path.join(__dirname, 'config', 'sites.yaml'), 'utf8');
  return yaml.load(raw) || [];
}

async function cmdFetch(opts) {
  const allSites = loadSites();
  const sites = opts.site ? allSites.filter((s) => s.key === opts.site) : allSites;
  if (opts.site && sites.length === 0) {
    console.error(`unknown site key "${opts.site}" — check config/sites.yaml`);
    process.exit(1);
  }

  const seen = loadSeen();
  // Carry forward anything left unclassified by a previous `finalize` run
  // instead of re-fetching it — see cmdFinalize's partial-batch handling.
  const pending = loadPending();
  const alreadyPending = new Set(pending.map((r) => r.id));
  // classify:false sources (e.g. a forum watcher) skip the whole pending/
  // finalize flow — there's no fit judgment to make, just "is this new."
  // These go straight into today's report from fetch alone.
  const directReport = [];

  for (const site of sites) {
    let adapter;
    try {
      adapter = await import(`./adapters/${site.adapter}.js`);
    } catch (err) {
      logFetchError(site.key, new Error(`unknown adapter "${site.adapter}": ${err.message}`));
      continue;
    }

    let items;
    try {
      items = await adapter.list(site);
    } catch (err) {
      logFetchError(site.key, err);
      continue;
    }

    for (const item of items) {
      // item.resolvedId lets an adapter precompute the id its own detail()
      // will record under, when that differs from the generic
      // (site.adapter, site.key, item.externalId) triple — e.g. Paradigm
      // rows that resolve to an underlying Greenhouse/Lever/Ashby posting.
      // Without this, the hasSeen() check below would use a different id
      // than finalize() stores, so the posting would look "new" forever.
      const id = item.id || item.resolvedId || makeId(site.adapter, site.key, item.externalId);
      if (hasSeen(seen, id)) {
        // Early-exit removed: a "sorted by recency" list is only a stable
        // proxy for "everything below is already seen" if the sort key
        // never changes for an already-seen item. Greenhouse's updated_at
        // and Ashby's publishedAt both change on a routine edit/repost, so
        // breaking here could permanently skip a genuinely new posting that
        // sorts below an edited old one. The list is already fully fetched
        // in memory (one API call) — scanning the rest just costs a cheap
        // hasSeen() lookup per item, no extra network calls.
        continue;
      }
      if (alreadyPending.has(id)) continue; // still queued from a previous unfinished batch

      let record;
      if (item.id) {
        record = item; // adapter already returned a full record (e.g. Lever)
      } else {
        try {
          record = await adapter.detail(site, item);
        } catch (err) {
          logFetchError(site.key, err);
          continue;
        }
      }

      if (site.classify === false) {
        markSeen(seen, record, 'NEW');
        directReport.push({ record, verdict: 'NEW', matched: [], reason: 'New since last check — no fit judgment applied.' });
        continue;
      }

      if (site.department_includes && !(record.department || '').toUpperCase().includes(site.department_includes.toUpperCase())) {
        markSeen(seen, record, 'FILTERED');
        logFiltered(record, `department "${record.department}" does not include "${site.department_includes}"`);
        continue;
      }

      pending.push(record);
    }
  }

  saveSeen(seen); // persists any Stage B filter marks even though those never reach pending
  savePending(pending);
  saveFetchMeta({ sitesChecked: sites.length, timestamp: new Date().toISOString() });

  console.log(`Checked ${sites.length} site(s). ${pending.length} new posting(s) need classification.`);
  if (pending.length) {
    console.log('Written to state/pending.json. Classify each against config/checklist.yaml, then run:');
    console.log('  node scout.js finalize <classifications.json>');
  }

  if (directReport.length) {
    const date = new Date().toISOString().slice(0, 10);
    const reportPaths = writeReportsByRegion({ date, sitesChecked: sites.length, entries: directReport });
    console.log(`${directReport.length} item(s) from classify:false source(s) written directly to: ${reportPaths.join(', ')}`);
  }
}

async function cmdFinalize(classificationsPath) {
  if (!classificationsPath) {
    console.error('usage: node scout.js finalize <classifications.json>');
    process.exit(1);
  }

  const pending = loadPending();
  const classifications = JSON.parse(fs.readFileSync(classificationsPath, 'utf8'));
  const byId = new Map(classifications.map((c) => [c.id, c]));

  const seen = loadSeen();
  const classified = [];
  const stillPending = [];
  for (const record of pending) {
    const c = byId.get(record.id);
    if (!c) {
      console.error(`warning: no classification for ${record.id} (${record.company} — ${record.title}), leaving in pending`);
      stillPending.push(record);
      continue;
    }
    // An off-schema verdict (wrong case, extra words, typo) from the
    // classifying model must not be marked seen — that would bury the
    // posting for good: it matches no report section (report.js filters on
    // exact verdict strings), isn't discard-logged, gets no snapshot, and
    // never re-fetches since hasSeen() would now return true. Leaving it in
    // pending is recoverable; marking it seen silently is not.
    if (!VALID_VERDICTS.has(c.verdict)) {
      console.error(`warning: invalid verdict "${c.verdict}" for ${record.id} (${record.company} — ${record.title}), leaving in pending`);
      stillPending.push(record);
      continue;
    }
    // region ("br"/"intl") drives which of the two split report files this
    // record lands in — trust the classifying model's own tag (it reasoned
    // about location-br-strong-company + the actual text), falling back to
    // a plain string match only if the tag is missing/malformed.
    const region = c.region === 'br' || c.region === 'intl' ? c.region : inferRegion(record.location);
    markSeen(seen, record, c.verdict);
    classified.push({ record, ...c, region });
    if (c.verdict === 'DISCARD') logDiscard(record, c.verdict);
    // Only FIT/CLOSE are candidates for applying to — snapshot those so
    // `apply` can still recover the full text long after pending.json clears.
    if (c.verdict === 'FIT' || c.verdict === 'CLOSE') saveSnapshot(record, c.verdict, c.reason, region);
  }
  saveSeen(seen);

  const { sitesChecked } = loadFetchMeta();
  const date = new Date().toISOString().slice(0, 10);
  const reportPaths = writeReportsByRegion({ date, sitesChecked, entries: classified });
  savePending(stillPending); // partial batches: unclassified records wait for the next finalize call

  console.log(reportPaths.length ? `Report(s) written: ${reportPaths.join(', ')}` : 'No FIT/CLOSE/other classified records this batch — no report written.');
  if (stillPending.length) {
    console.log(`${stillPending.length} record(s) left unclassified in state/pending.json.`);
  }
}

const VALID_VERDICTS = new Set(['FIT', 'CLOSE', 'DISCARD', 'UNRESOLVED', 'NEW']);

// Core operations, reusable by the standalone CLI commands and by
// sync-report's batch processing. Each mutates `seen` in place and returns a
// short result message; the caller is responsible for loadSeen/saveSeen.
function correctOne(seen, url, verdict, note) {
  if (!VALID_VERDICTS.has(verdict)) throw new Error(`invalid verdict "${verdict}"`);
  const found = findSeenByUrl(seen, url);
  if (!found) throw new Error(`no seen record found for url: ${url}`);
  const from = found.verdict;
  seen[found.id] = { ...seen[found.id], verdict, lastRun: new Date().toISOString() };
  logCorrection({ id: found.id, company: found.company, title: found.title, url, from, to: verdict, note: note || null });
  return `Corrected: ${found.company} — ${found.title}: ${from} -> ${verdict}${note ? ` (${note})` : ''}`;
}

// status is your own application-tracking state (open/applied/closed)
// — independent of `verdict` (Claude's fit judgment). "applied" additionally
// promotes the snapshot into applications/, since that's the one status that
// needs the full text preserved for interview prep.
//
// `meta` (optional {company, title}) only matters when the url was never
// scouted — e.g. you say "applied" to a link you found on LinkedIn
// directly, not via this pipeline. Rather than requiring every application
// to have come through `fetch` first, we create a minimal ad-hoc seen
// record on the fly so it's tracked (and dedupe-able against a future
// "did I already apply?") the same as a scouted posting would be.
function statusOne(seen, url, status, meta) {
  let found = findSeenByUrl(seen, url);
  if (!found) {
    const id = makeId('external', 'manual', url);
    seen[id] = {
      company: meta?.company || '(external — not from scout)',
      title: meta?.title || url,
      url,
      verdict: 'NEW',
      status: null,
      firstSeen: new Date().toISOString(),
      lastRun: new Date().toISOString(),
    };
    found = { id, ...seen[id] };
  }
  setStatus(seen, found.id, status);
  logCorrection({ id: found.id, company: found.company, title: found.title, url, action: `status:${status}` });

  if (status !== 'applied') {
    return `Marked ${status}: ${found.company} — ${found.title}`;
  }
  const snapshot = loadSnapshot(found.id);
  const filePath = writeApplicationSnapshot(found, snapshot);
  const note = snapshot ? '' : ' (no text snapshot available — link only)';
  return `Marked applied: ${found.company} — ${found.title} -> ${path.relative(JOBHUNT_ROOT, filePath)}${note}`;
}

async function cmdCorrect(url, verdict, note) {
  if (!url || !VALID_VERDICTS.has(verdict)) {
    console.error('usage: node scout.js correct <url> <FIT|CLOSE|DISCARD|UNRESOLVED|NEW> ["note"]');
    process.exit(1);
  }
  const seen = loadSeen();
  try {
    console.log(correctOne(seen, url, verdict, note));
    saveSeen(seen);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

const VALID_STATUSES = new Set(['open', 'applied', 'closed']);

async function cmdStatus(url, status, opts) {
  if (!url || !VALID_STATUSES.has(status)) {
    console.error('usage: node scout.js status <url> <open|applied|closed> [--company="X"] [--title="Y"]');
    process.exit(1);
  }
  const seen = loadSeen();
  try {
    console.log(statusOne(seen, url, status, { company: opts?.company, title: opts?.title }));
    saveSeen(seen);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

// Bulk mode: reads a report file and processes two kinds of per-entry marks
// you can add while reviewing, each idempotent (re-running is a no-op
// for lines already handled, marked "✓ synced <date>"):
//
// 1. A checked status box — the common case, one per entry already rendered
//    by report.js: "- [x] open", "- [x] applied", "- [x] closed — not a fit".
// 2. A "> FIT|CLOSE|DISCARD|..." line — the rarer case where Claude's own
//    fit judgment was wrong (see checklist.yaml's remote-region-restricted
//    note for a real example) and needs correcting, not just a status set.
//
// [ \t]* (not \s*) around the keyword — \s matches newlines too, which let
// trailing whitespace swallow the line break and put the sync marker on its
// own line instead of appending it inline. Caught by testing.
//
// Matches ONLY a checked box ([x]/[X]) — matching any box regardless of
// checked state and then filtering was the first attempt, but `.match()`
// (no /g) returns the first occurrence in source order, which is always the
// unchecked "open" line since it's rendered first. Caught by testing.
const CHECKED_BOX_RE = /^- \[[xX]\][ \t]*(open|applied|closed)\b(?!.*✓ synced)(.*)$/m;
const ANNOTATION_RE = /^>[ \t]*(applied|discard|fit|close|unresolved|new)[ \t]*(?:—.*)?$/im;
// The fourth checkbox (report.js) — additive, not a status/verdict change.
// Note body can be inline after the em dash on the checkbox line itself
// (the common case in practice — captured via group 1) AND/OR free text
// below the checked line (captured separately via lineEnd below); both are
// joined. An earlier version only looked below the line, which silently
// dropped every inline note (`.*$` in the regex swallowed the inline text
// into the full-line match before the "look below" slice ever ran) —
// caught 2026-07-27 when a real report's notes came back empty.
const NOTE_BOX_RE = /^- \[[xX]\][ \t]*note\b(?!.*✓ synced)(.*)$/m;

async function cmdSyncReport(reportPath) {
  if (!reportPath) {
    console.error('usage: node scout.js sync-report <path/to/report.md>');
    process.exit(1);
  }
  const text = fs.readFileSync(reportPath, 'utf8');
  // Split before "## " section headers too, not just "### " entries — the
  // last entry in a section otherwise has no boundary before the next
  // section's h2 header, so its note "below the line" slice swallows that
  // header text. Caught 2026-07-27 alongside the inline-note bug above.
  const blocks = text.split(/\n(?=#{2,3} )/);
  const seen = loadSeen();
  let processed = 0;
  let failed = 0;

  const newBlocks = blocks.map((block) => {
    const linkMatch = block.match(/\[link\]\(([^)]+)\)/);
    if (!linkMatch) return block;
    const url = linkMatch[1];
    let updated = block;

    const boxMatch = updated.match(CHECKED_BOX_RE);
    if (boxMatch) {
      const status = boxMatch[1];
      try {
        console.log(statusOne(seen, url, status));
        processed++;
        updated = updated.replace(CHECKED_BOX_RE, (m) => `${m} — ✓ synced ${new Date().toISOString().slice(0, 10)}`);
      } catch (err) {
        console.error(`sync-report: ${err.message}`);
        failed++;
      }
    }

    const annMatch = updated.match(ANNOTATION_RE);
    if (annMatch && !/✓ synced/.test(annMatch[0])) {
      const action = annMatch[1].toLowerCase();
      try {
        const message = action === 'applied' ? statusOne(seen, url, 'applied') : correctOne(seen, url, action.toUpperCase(), 'via sync-report');
        console.log(message);
        processed++;
        updated = updated.replace(ANNOTATION_RE, (m) => `${m} — ✓ synced ${new Date().toISOString().slice(0, 10)}`);
      } catch (err) {
        console.error(`sync-report: ${err.message}`);
        failed++;
      }
    }

    const noteMatch = updated.match(NOTE_BOX_RE);
    if (noteMatch) {
      const inlineText = (noteMatch[1] || '').replace(/^[ \t]*[—-][ \t]*/, '').trim();
      const lineEnd = updated.indexOf(noteMatch[0]) + noteMatch[0].length;
      const belowText = updated.slice(lineEnd).trim();
      const noteText = [inlineText, belowText].filter(Boolean).join('\n').trim();
      try {
        let found = null;
        try {
          found = findSeenByUrl(seen, url);
        } catch {
          // ambiguous url — still log the note, just without company/title context
        }
        logNote({ id: found?.id, company: found?.company, title: found?.title, url, note: noteText });
        console.log(`Noted: ${found ? `${found.company} — ${found.title}` : url}${noteText ? ` — ${noteText.slice(0, 80)}` : ''}`);
        processed++;
        updated = updated.replace(NOTE_BOX_RE, (m) => `${m} — ✓ synced ${new Date().toISOString().slice(0, 10)}`);
      } catch (err) {
        console.error(`sync-report: ${err.message}`);
        failed++;
      }
    }

    return updated;
  });

  saveSeen(seen);
  fs.writeFileSync(reportPath, newBlocks.join('\n'));
  console.log(`sync-report: ${processed} processed, ${failed} failed.`);
}

const DIGEST_PATHS = {
  br: path.join(JOBHUNT_ROOT, 'scouting', 'state', 'br', 'pending-digest.md'),
  intl: path.join(JOBHUNT_ROOT, 'scouting', 'state', 'intl', 'pending-digest.md'),
};
const DIGEST_LABELS = { br: 'Brazil', intl: 'International' };

// `status` lives only in state/seen.json, keyed by id — a dated
// reports/<date>.md never gets updated once you reviews an entry, so
// everything still awaiting a decision (explicitly marked "open", or never
// reviewed at all — no box ever checked) is otherwise scattered across
// however many report files he's touched, or a backlog he never got to.
// This rebuilds that view from seen.json (the single source of truth for
// status) instead of re-reading every report. `closed` and `applied` are
// terminal — both excluded on purpose (see cmdDigest's filter).
//
// Reuses the same block shape report.js renders (### header, [link](...),
// the four status checkboxes) so `sync-report` works on this file exactly
// like any other report — check a box here, run sync-report on this path,
// done. Regenerated wholesale on every run: don't hand-edit content outside
// the checkboxes, it won't survive the next `digest`.
// `n` numbers the entry — same purely-cosmetic running count as report.js's
// sections (sync-report still matches by [link](...), never by number).
function renderDigestBlock(n, id, v) {
  const snap = loadSnapshot(id);
  const loc = snap && snap.location && snap.location !== 'n/a'
    ? `${snap.location}${snap.remoteType && snap.remoteType !== 'unknown' && snap.remoteType !== 'n/a' ? ` (${snap.remoteType})` : ''} · `
    : '';
  const via = snap?.ats ? `via ${snap.ats} · ` : '';
  const reasonLine = snap?.reason ? `${snap.reason}\n` : '';
  const waitingSince = v.firstSeen.slice(0, 10);
  const statusLabel = v.status === 'open' ? 'open' : 'unreviewed';
  const statusBoxes = [
    '- [ ] open — still waiting',
    '- [ ] applied',
    '- [ ] closed — not a fit',
    '- [ ] note — leave a comment or adjustment request below this line',
  ].join('\n');
  return `### ${n}. ${v.company} — ${v.title}\n${loc}${via}[link](${v.url}) · verdict ${v.verdict} · ${statusLabel} since ${waitingSince}\n${reasonLine}${statusBoxes}\n`;
}

// region: trust the snapshot's own `region` tag (set at finalize time going
// forward) — fall back to inferring from its `location` for snapshots saved
// before this field existed, so nothing silently drops out of either file.
function regionOfPendingEntry(id) {
  const snap = loadSnapshot(id);
  if (snap?.region === 'br' || snap?.region === 'intl') return snap.region;
  return inferRegion(snap?.location);
}

// "Pending" = still awaiting a real decision: explicitly marked `open`, OR
// never reviewed at all (status null/undefined — no box ever checked on
// whatever dated report it first appeared in). Both land in the same
// consolidated view on purpose — from your side "I marked this open"
// and "I never got to this" are the same backlog. `closed` and `applied`
// are terminal and excluded. Requires verdict FIT/CLOSE — DISCARD records
// never appear in a report and so never get a status, but they're not part
// of anyone's review backlog either.
function cmdDigest() {
  const seen = loadSeen();
  const pending = Object.entries(seen)
    .filter(([, v]) => (v.verdict === 'FIT' || v.verdict === 'CLOSE') && v.status !== 'closed' && v.status !== 'applied')
    .sort((a, b) => new Date(a[1].firstSeen) - new Date(b[1].firstSeen)); // oldest-waiting first

  const byRegion = { br: [], intl: [] };
  for (const entry of pending) {
    byRegion[regionOfPendingEntry(entry[0])].push(entry);
  }

  const counts = {};
  for (const region of ['br', 'intl']) {
    const entries = byRegion[region];
    const blocks = entries.map(([id, v], i) => renderDigestBlock(i + 1, id, v));
    const digestPath = DIGEST_PATHS[region];
    const header = `# Pending digest — ${DIGEST_LABELS[region]} — regenerated ${new Date().toISOString().slice(0, 10)}\n\n${entries.length} posting(s) still awaiting a decision in this region (marked "open", or never reviewed at all), oldest-waiting first. This file is fully regenerated by \`node scout.js digest\` every run — don't hand-edit anything outside the checkboxes, it won't survive the next run. Check boxes here exactly like a normal report, then \`node scout.js sync-report ${path.relative(JOBHUNT_ROOT, digestPath)}\`.\n\n`;
    fs.mkdirSync(path.dirname(digestPath), { recursive: true });
    fs.writeFileSync(digestPath, header + (blocks.length ? blocks.join('\n') : '_Nothing pending right now._\n'));
    counts[region] = entries.length;
  }

  return { openCount: counts.br + counts.intl, counts };
}

// Consolidated index of every application actually submitted, built from
// applications/<slug>/job-posting.md front matter (the per-job snapshot
// folder job-scout already writes on `apply`) — one place to see the whole
// list instead of opening each folder. Regenerated wholesale, same rule as
// the open digest: don't hand-edit below the marker.
const FRONTMATTER_FIELD_RE = /^(\w+):\s*(.*)$/;
function readFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fields = {};
  for (const line of m[1].split('\n')) {
    const fm = line.match(FRONTMATTER_FIELD_RE);
    if (!fm) continue;
    try {
      fields[fm[1]] = JSON.parse(fm[2]);
    } catch {
      fields[fm[1]] = fm[2];
    }
  }
  return fields;
}

const APPLICATIONS_INDEX_MARKER = '<!-- applications-index:generated -->';
function cmdApplicationsIndex() {
  const rows = [];
  if (fs.existsSync(APPLICATIONS_DIR)) {
    for (const slug of fs.readdirSync(APPLICATIONS_DIR)) {
      const postingPath = path.join(APPLICATIONS_DIR, slug, 'job-posting.md');
      if (!fs.existsSync(postingPath)) continue;
      const fm = readFrontmatter(fs.readFileSync(postingPath, 'utf8'));
      rows.push({ slug, ...fm });
    }
  }
  rows.sort((a, b) => (b.applied_at || '').localeCompare(a.applied_at || ''));

  const table = rows.length
    ? [
        '| Applied | Company | Title | Link |',
        '|---|---|---|---|',
        ...rows.map((r) => `| ${r.applied_at || '?'} | ${r.company || '?'} | ${r.title || '?'} | [posting](${r.slug}/job-posting.md)${r.url ? ` · [live](${r.url})` : ''} |`),
      ].join('\n')
    : '_No applications recorded yet._';

  const body = `# applications\n\nSee ../CLAUDE.md.\n\n${APPLICATIONS_INDEX_MARKER}\n\n${rows.length} application(s) so far, most recent first. Regenerated by \`node scout.js digest\` from each folder's \`job-posting.md\` front matter — don't hand-edit this table.\n\n${table}\n`;
  fs.writeFileSync(path.join(APPLICATIONS_DIR, 'README.md'), body);
  return { count: rows.length };
}

async function cmdFullDigest() {
  const { counts } = cmdDigest();
  const { count } = cmdApplicationsIndex();
  console.log(`Pending digest — Brazil: ${counts.br} posting(s) -> ${path.relative(JOBHUNT_ROOT, DIGEST_PATHS.br)}`);
  console.log(`Pending digest — International: ${counts.intl} posting(s) -> ${path.relative(JOBHUNT_ROOT, DIGEST_PATHS.intl)}`);
  console.log(`Applications index: ${count} entrie(s) -> applications/README.md`);
}

function parseOpts(args) {
  const opts = {};
  for (const arg of args) {
    const m = arg.match(/^--(\w[\w-]*)(?:=(.*))?$/);
    if (m) opts[m[1]] = m[2] ?? true;
  }
  return opts;
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'fetch') {
  await cmdFetch(parseOpts(rest));
} else if (cmd === 'finalize') {
  await cmdFinalize(rest.find((a) => !a.startsWith('--')));
} else if (cmd === 'correct') {
  await cmdCorrect(rest[0], rest[1], rest.slice(2).join(' ') || undefined);
} else if (cmd === 'status') {
  const positional = rest.filter((a) => !a.startsWith('--'));
  await cmdStatus(positional[0], positional[1], parseOpts(rest));
} else if (cmd === 'apply') {
  const positional = rest.filter((a) => !a.startsWith('--'));
  await cmdStatus(positional[0], 'applied', parseOpts(rest)); // shortcut
} else if (cmd === 'sync-report') {
  await cmdSyncReport(rest[0]);
} else if (cmd === 'digest') {
  await cmdFullDigest();
} else {
  console.error('usage: node scout.js fetch [--site=<key>]');
  console.error('       node scout.js finalize <classifications.json>');
  console.error('       node scout.js correct <url> <FIT|CLOSE|DISCARD|UNRESOLVED|NEW> ["note"]');
  console.error('       node scout.js status <url> <open|applied|closed> [--company="X"] [--title="Y"]');
  console.error('       node scout.js apply <url> [--company="X"] [--title="Y"]');
  console.error('       node scout.js sync-report <path/to/report.md>');
  console.error('       node scout.js digest');
  process.exit(1);
}
