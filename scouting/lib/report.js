import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// `counter` is a shared `{ n: 1 }` object mutated across sections so entry
// numbers run continuously through the whole file (FIT 1-5, CLOSE 6-12, ...)
// instead of restarting per section — the point is a running "how many have
// I gone through today" count, not a per-bucket index. Purely cosmetic: the
// number lives in the heading only, `sync-report` still matches blocks by
// their [link](...) url, so renumbering across runs never breaks sync.
function section(title, items, counter, note) {
  if (items.length === 0) return '';
  const body = items
    .map(({ record, matched, reason }) => {
      const n = counter.n++;
      const loc = record.location === 'n/a' ? '' : `${record.location}${record.remoteType !== 'unknown' && record.remoteType !== 'n/a' ? ` (${record.remoteType})` : ''} · `;
      const matchedLine = matched?.length ? `Matched: ${matched.join(', ')}. ` : '';
      // Real clickable checkboxes (GFM task list) — check exactly one of the
      // first three as you review. Independent of `verdict` (Claude's fit
      // judgment): this is your own application-tracking status, read
      // by `sync-report`. The fourth ("note") is separate and additive — can
      // be checked alongside any status, for free-form feedback that isn't a
      // status/verdict change (write the note as text right after the line).
      const statusBoxes = [
        '- [ ] open — will apply later',
        '- [ ] applied',
        '- [ ] closed — not a fit',
        '- [ ] note — leave a comment or adjustment request below this line',
      ].join('\n');
      return `### ${n}. ${record.company} — ${record.title}\n${loc}via ${record.ats} · [link](${record.url})\n${matchedLine}${reason}\n${statusBoxes}\n`;
    })
    .join('\n');
  return `## ${title}${note ? ` — ${note}` : ''}\n\n${body}`;
}

// classified: [{ record, verdict: 'FIT'|'CLOSE'|'DISCARD'|'UNRESOLVED'|'NEW', matched: [], violated: [], reason: '' }]
// NEW = no fit judgment applied at all (classify:false sources, e.g. a forum
// watcher) — just "this is new since last check," surfaced as-is.
//
// Renders one finalize batch's worth of results — no top-level date header,
// since a day can have multiple batches (one per site, or a re-run) that all
// belong in the same day's report. See writeReport for how batches combine.
function renderBatch({ sitesChecked, classified }) {
  const fit = classified.filter((c) => c.verdict === 'FIT');
  const close = classified.filter((c) => c.verdict === 'CLOSE');
  const discard = classified.filter((c) => c.verdict === 'DISCARD');
  const unresolved = classified.filter((c) => c.verdict === 'UNRESOLVED');
  const fresh = classified.filter((c) => c.verdict === 'NEW');

  const summary = `Sites checked: ${sitesChecked} · New postings: ${classified.length} · FIT: ${fit.length} · CLOSE: ${close.length} · Discarded (not shown): ${discard.length}${unresolved.length ? ` · Needs manual look: ${unresolved.length}` : ''}${fresh.length ? ` · New (unfiltered): ${fresh.length}` : ''}\n`;

  const counter = { n: 1 };
  const sections = [
    section('FIT', fit, counter),
    section('CLOSE', close, counter, 'needs your judgment'),
    section('Needs a manual look', unresolved, counter, "couldn't auto-extract the description — check the link yourself"),
    section('New', fresh, counter, 'no fit judgment applied — just new since last check'),
  ].filter(Boolean);

  if (sections.length === 0) {
    return `${summary}\nNothing new this batch.\n`;
  }

  return `${summary}\n${sections.join('\n\n')}\n`;
}

const REGION_LABELS = { br: 'Brazil', intl: 'International' };
function regionLabel(region) {
  const label = REGION_LABELS[region];
  if (!label) throw new Error(`invalid region "${region}" — expected "br" or "intl"`);
  return label;
}

// Exported for anyone wanting a single self-contained doc (e.g. previewing a
// batch before writing it) — includes the header renderBatch omits.
export function renderReport({ date, sitesChecked, classified, region }) {
  return `# Job Scout Report — ${regionLabel(region)} — ${date}\n${renderBatch({ sitesChecked, classified })}`;
}

// Multiple finalize calls can happen on the same day (one per site, or a
// re-run after classifying more of a partial batch). The first batch of the
// day gets the plain `<date>.md` name. Any later batch writes its own new
// `<date>-HHMM.md` file instead of appending to the existing one — confirmed
// 2026-07-27 after an append collided with you actively reviewing
// (checking boxes/notes) that same file in an editor: his save round-tripped
// a stale in-memory copy and silently wiped the just-appended batch. A
// distinct filename per batch means nothing ever reopens/rewrites a file
// that might be open elsewhere. `region` ("br" | "intl") picks which of the
// two split report directories (reports/br/, reports/intl/) this batch
// belongs to — callers filter `classified` down to one region's records
// before calling.
export function writeReport({ date, sitesChecked, classified, region }) {
  const label = regionLabel(region);
  const dir = path.join(REPORTS_DIR, region);
  fs.mkdirSync(dir, { recursive: true });
  const basePath = path.join(dir, `${date}.md`);
  const batch = renderBatch({ sitesChecked, classified });
  const header = `# Job Scout Report — ${label} — ${date}\n\n`;

  if (!fs.existsSync(basePath)) {
    fs.writeFileSync(basePath, header + batch);
    return basePath;
  }

  const time = new Date().toISOString().slice(11, 16).replace(':', '');
  const batchPath = path.join(dir, `${date}-${time}.md`);
  fs.writeFileSync(batchPath, header + batch);
  return batchPath;
}
