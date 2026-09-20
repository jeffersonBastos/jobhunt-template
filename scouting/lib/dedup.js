import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, '..', 'state');
export const SEEN_PATH = path.join(STATE_DIR, 'seen.json');
export const PENDING_PATH = path.join(STATE_DIR, 'pending.json');
export const FETCH_META_PATH = path.join(STATE_DIR, 'last-fetch-meta.json');
export const ERRORS_LOG_PATH = path.join(STATE_DIR, 'fetch-errors.log');
export const DISCARD_LOG_PATH = path.join(STATE_DIR, 'discard-log.jsonl');
export const FILTERED_LOG_PATH = path.join(STATE_DIR, 'filtered-log.jsonl');
export const NOTES_LOG_PATH = path.join(STATE_DIR, 'notes-log.jsonl');

function readJson(p, fallback) {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err; // exists but unreadable (permissions, etc.) — don't mask it as "empty"
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    // A truncated/corrupt file (e.g. process killed mid-write) must not
    // silently look like "no history yet" — that would make the next fetch
    // re-classify everything as new and quietly wipe out every verdict,
    // correction, and applied-status you has ever recorded here.
    throw new Error(`corrupt state file ${p}: ${err.message} — refusing to silently treat it as empty. Restore or repair it by hand before continuing.`);
  }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Write to a temp file and rename (atomic on the same filesystem) instead
  // of writing the target in place, so a process killed mid-write leaves
  // the previous good version intact instead of a truncated/corrupt file.
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, p);
}

export function loadSeen() {
  return readJson(SEEN_PATH, {});
}

export function saveSeen(state) {
  writeJson(SEEN_PATH, state);
}

export function hasSeen(state, id) {
  return Object.prototype.hasOwnProperty.call(state, id);
}

export function markSeen(state, record, verdict) {
  state[record.id] = {
    company: record.company,
    title: record.title,
    url: record.url || state[record.id]?.url || null,
    verdict,
    // status is independent of verdict — verdict is Claude's fit judgment
    // (FIT/CLOSE/DISCARD/...), status is your own application
    // tracking (open/applied/closed), set later via the review checkboxes.
    // Not "applied: boolean" anymore — see setStatus.
    status: state[record.id]?.status || null,
    firstSeen: state[record.id]?.firstSeen || new Date().toISOString(),
    lastRun: new Date().toISOString(),
  };
}

const VALID_STATUSES = new Set(['open', 'applied', 'closed']);
export function setStatus(state, id, status) {
  if (!VALID_STATUSES.has(status)) throw new Error(`invalid status "${status}"`);
  state[id] = { ...state[id], status, statusAt: new Date().toISOString() };
}

// Find a seen record by its posting URL — used by the `correct`/`apply` CLI
// commands, since you refer to jobs by the link you're looking at, not
// by internal id. Strips known TRACKING params (utm_*, lever-source[]) so
// those don't break the lookup — but keeps everything else. Confirmed live
// 2026-07-23: stripping the whole query string (the original approach)
// collapsed every Stripe posting onto the same bare
// "stripe.com/jobs/search" URL, since Stripe's custom career page encodes
// the actual job identity in `?gh_jid=...` — that made findSeenByUrl throw
// "ambiguous" for every single Stripe posting and silently broke
// sync-report for any of them. Only strip params that are genuinely just
// tracking noise, never the whole query string.
const TRACKING_PARAM_RE = /^(utm_[a-z]+|lever-source(%5B%5D|\[\])?)$/i;
function strip(u) {
  if (!u) return u;
  try {
    const parsed = new URL(u);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAM_RE.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return u; // malformed/relative url — compare as-is rather than guessing
  }
}
export function findSeenByUrl(state, url) {
  const target = strip(url);
  const matches = Object.entries(state).filter(([, v]) => strip(v.url) === target);
  if (matches.length > 1) {
    // Some sources (Paradigm-unresolved rows, cow-careers) can't produce a
    // per-job URL and fall back to a shared listing-page link — several
    // distinct jobs then share the same stripped URL. Picking "the first
    // one" here would silently attach a status/correction to the wrong
    // job with no error. Refuse and make the caller disambiguate instead.
    const candidates = matches.map(([id, v]) => `${id} (${v.company} — ${v.title})`).join('; ');
    throw new Error(`ambiguous url — ${matches.length} seen records share it, cannot tell them apart: ${candidates}. Fix the underlying adapter to emit a per-job URL, or disambiguate manually before retrying.`);
  }
  return matches.length ? { id: matches[0][0], ...matches[0][1] } : null;
}

// Append-only audit trail for corrections made via `scout.js correct`/`apply`
// — distinct from the original classification, so it's clear what changed
// and why.
export const CORRECTIONS_LOG_PATH = path.join(STATE_DIR, 'corrections-log.jsonl');
export function logCorrection(entry) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.appendFileSync(CORRECTIONS_LOG_PATH, JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n');
}

// Full-text snapshots for FIT/CLOSE records only (not the whole firehose) —
// kept just long enough to survive from `finalize` (which has the full job
// text) to a later `apply` (which doesn't, since pending.json is long
// cleared by then). `apply` promotes a snapshot into the git-tracked
// `applications/` folder; this cache itself is ephemeral/gitignored.
const SNAPSHOTS_DIR = path.join(STATE_DIR, 'snapshots');
export function saveSnapshot(record, verdict, reason, region) {
  writeJson(path.join(SNAPSHOTS_DIR, `${record.id}.json`), { ...record, verdict, reason, region, snapshotAt: new Date().toISOString() });
}
export function loadSnapshot(id) {
  return readJson(path.join(SNAPSHOTS_DIR, `${id}.json`), null);
}

export function loadPending() {
  return readJson(PENDING_PATH, []);
}

export function savePending(records) {
  writeJson(PENDING_PATH, records);
}

export function loadFetchMeta() {
  return readJson(FETCH_META_PATH, { sitesChecked: 0, timestamp: null });
}

export function saveFetchMeta(meta) {
  writeJson(FETCH_META_PATH, meta);
}

export function logFetchError(siteKey, err) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const line = `${new Date().toISOString()} [${siteKey}] ${err?.message || err}\n`;
  fs.appendFileSync(ERRORS_LOG_PATH, line);
}

export function logDiscard(record, verdict) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const line = JSON.stringify({ ...record, verdict, loggedAt: new Date().toISOString() }) + '\n';
  fs.appendFileSync(DISCARD_LOG_PATH, line);
}

// Script-level Stage B filter (e.g. department_includes) — distinct from
// logDiscard, which is an LLM-judgment DISCARD. Kept separate so a too-strict
// filter is easy to spot and tune without digging through LLM discards.
export function logFiltered(record, reason) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const line = JSON.stringify({ ...record, filterReason: reason, loggedAt: new Date().toISOString() }) + '\n';
  fs.appendFileSync(FILTERED_LOG_PATH, line);
}

// Free-form feedback from the "note" checkbox (sync-report) — purely
// informational, doesn't touch verdict or status. A future session should
// check this log for anything left unread since its last visit instead of
// re-grepping every report file for hand-typed "notes:" lines by hand.
export function logNote({ id, company, title, url, note }) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const line = JSON.stringify({ id: id || null, company: company || null, title: title || null, url, note, at: new Date().toISOString() }) + '\n';
  fs.appendFileSync(NOTES_LOG_PATH, line);
}
