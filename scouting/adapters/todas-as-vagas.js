// edsonjunioor32.github.io/todas-as-vagas — an independent, static
// GitHub Pages index aggregating postings from ~15 sources (Gupy, Greenhouse,
// Ashby, Himalayas, WeWorkRemotely, TheMuse, Arbeitnow, InHire, Stone,
// GeekHunter, Jobicy, WorkingNomads, ...). robots.txt on the real page path
// (/todas-as-vagas/robots.txt) is `Allow: /` — confirmed live 2026-08-18.
//
// Data lives at a single unauthenticated JSON file the page's own frontend
// fetches client-side (found via grepping app.js for the fetch call):
//   https://edsonjunioor32.github.io/todas-as-vagas/data/vagas.json
// ~37k postings (confirmed live), refreshed on its own schedule (`generated_at`).
//
// Shape is NOT row-objects like every other adapter here — it's columnar:
// `jobs.<field>[]` are parallel arrays (same index = same posting), and
// several fields (src/cmp/area/sen/wm/mk/co) are integers indexing into
// `dict.<field>[]` lookup tables (e.g. `dict.area[jobs.area[i]]` is the
// human-readable area name). See toRow() below for the reconstruction.
//
// Critically, THIS FEED HAS NO DESCRIPTION TEXT — title/company/location/
// contract-type/salary only, confirmed by inspecting every column. Getting
// real fit-judgment text means a second fetch to the underlying original
// posting, so this adapter resolves known platforms the same way
// paradigm.js does (fetch full text for Greenhouse-direct/Ashby/Lever URLs,
// leave everything else as a thin "check the link manually" record) — same
// triage philosophy, reused here because ~37k postings makes fetching every
// row's origin page infeasible.
//
// Two script-only (0-token) pre-filters run before any network call beyond
// the single vagas.json fetch, same spirit as gupy-portal/paradigm:
//   1. area — restricted to TI e Desenvolvimento / Dados, BI e IA (still
//      ~5.4k rows as of 2026-08-18 — the site spans every industry).
//   2. title keyword filter (site.title_includes override; default mirrors
//      checklist.yaml's known_stack) — brings the candidate set down to a
//      size where per-row detail fetches are actually feasible, same reason
//      paradigm.js has DEFAULT_TITLE_FILTER.
//
// Gupy rows get special treatment, deliberately breaking from paradigm.js's
// "resolvedId stays namespaced to the discovery source" convention: this
// aggregator's Gupy coverage (11.4k rows total) genuinely overlaps with the
// already-tracked `gupy-portal` site (same underlying postings, same Gupy
// job ids — confirmed by decoding the `/job/<base64>` URL segment, which
// carries the literal `{"jobId": ..., "source": "gupy_portal"}` payload
// gupy-portal's own API returns as `job.id`). Without cross-collapsing,
// every Gupy posting gupy-portal already saw would resurface here as "new"
// on every run. So Gupy rows compute `resolvedId` under gupy-portal's own
// (ats, siteKey) pair, not this site's — real duplicate-prevention, not
// just a stable-id optimization. Rows gupy-portal's narrower keyword search
// missed still flow through as genuinely new.

import { fetchText, fetchJson, htmlToText, extractNextData } from './_base.js';
import { makeRecord, makeId } from '../lib/normalize.js';

const DATA_URL = 'https://edsonjunioor32.github.io/todas-as-vagas/data/vagas.json';

const DEFAULT_AREAS = ['TI e Desenvolvimento', 'Dados, BI e IA'];
const DEFAULT_TITLE_FILTER =
  /\b(node\.?js|nest\.?js|typescript|javascript|backend|back-end|full.?stack|software engineer|desenvolvedor|engenheiro de software|blockchain|web3|smart contract|solidity|python|rust|postgres|graphql)\b/i;

const UNRESOLVED_TEXT = '(no description in the aggregator feed, and not a platform this adapter auto-resolves — check the link manually)';

function decodeGupyJobId(url) {
  const m = url.match(/\.gupy\.io\/job\/([A-Za-z0-9+/=]+)/);
  if (!m) return null;
  try {
    const payload = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
    return payload.jobId ? String(payload.jobId) : null;
  } catch {
    return null;
  }
}

function resolvePlatform(url) {
  let m;
  if ((m = url.match(/\.gupy\.io\/job\//))) {
    const jobId = decodeGupyJobId(url);
    const subdomainM = url.match(/https?:\/\/([^.]+)\.gupy\.io/);
    if (jobId && subdomainM) return { ats: 'gupy', subdomain: subdomainM[1], externalId: jobId };
  }
  if ((m = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/))) {
    return { ats: 'greenhouse', token: m[1], externalId: m[2] };
  }
  if ((m = url.match(/jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/i))) {
    return { ats: 'lever', site: m[1], externalId: m[2] };
  }
  if ((m = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([0-9a-f-]{36})/i))) {
    return { ats: 'ashby', org: m[1], externalId: m[2] };
  }
  return null;
}

// Mirrors paradigm.js's platformExternalId(): the externalId string a
// resolved row will be recorded under once detail() runs, shared by list()
// (to precompute resolvedId) and detail() (to build the actual record) so
// the two can never drift apart — see paradigm.js's header comment for the
// bug history when that discipline slipped (silently re-fetched and
// re-classified everything, clobbering manual corrections).
function platformExternalId(platform) {
  if (platform.ats === 'gupy') return platform.externalId; // cross-collapse target: gupy-portal's own raw job id, unwrapped
  const ns = platform.token ?? platform.site ?? platform.org;
  return `todas-as-vagas:${ns}:${platform.externalId}`;
}

function resolvedIdFor(site, platform) {
  if (!platform) return null;
  if (platform.ats === 'gupy') {
    // Deliberate cross-site collapse — see header comment.
    return makeId('gupy-portal', 'gupy-portal', platformExternalId(platform));
  }
  return makeId(platform.ats, site.key, platformExternalId(platform));
}

function toRow(jobs, dict, i) {
  return {
    title: jobs.title[i],
    company: dict.company[jobs.cmp[i]],
    area: dict.area[jobs.area[i]],
    workModel: dict.work_model[jobs.wm[i]],
    city: jobs.city[i],
    url: jobs.url[i],
    updatedAt: jobs.pub[i] || null,
  };
}

export async function list(site) {
  const data = await fetchJson(DATA_URL);
  const { jobs, dict } = data;
  const areas = new Set(site.areas || DEFAULT_AREAS);
  const titleFilter = site.title_includes ? new RegExp(site.title_includes, 'i') : DEFAULT_TITLE_FILTER;

  const rows = [];
  for (let i = 0; i < jobs.title.length; i++) {
    const areaName = dict.area[jobs.area[i]];
    if (!areas.has(areaName)) continue;
    if (!titleFilter.test(jobs.title[i])) continue;

    const row = toRow(jobs, dict, i);
    const platform = resolvePlatform(row.url);

    rows.push({
      externalId: row.url, // aggregator-level id, mirrors paradigm.js (href is unique enough)
      title: row.title,
      company: row.company,
      location: row.city || 'unknown',
      url: row.url,
      updatedAt: row.updatedAt,
      remoteType: row.workModel === 'remote' ? 'remote' : row.workModel === 'hybrid' ? 'hybrid' : row.workModel === 'on-site' ? 'onsite' : 'unknown',
      platform,
      resolvedId: resolvedIdFor(site, platform),
    });
  }
  return rows;
}

async function fetchGupyText(platform) {
  const html = await fetchText(`https://${platform.subdomain}.gupy.io/jobs/${platform.externalId}`);
  const data = extractNextData(html);
  const job = data?.props?.pageProps?.job;
  if (!job) return null;
  return [
    htmlToText(job.description),
    job.prerequisites ? `Requirements:\n${htmlToText(job.prerequisites)}` : '',
    job.responsibilities ? `Responsibilities:\n${htmlToText(job.responsibilities)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function fetchGreenhouseText(platform) {
  const job = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${platform.token}/jobs/${platform.externalId}?content=true`);
  const departments = (job.departments || []).map((d) => d.name).join(', ');
  const offices = (job.offices || []).map((o) => o.name).join(', ');
  return [`Department: ${departments}`, `Office: ${offices}`, htmlToText(job.content)].filter(Boolean).join('\n\n');
}

async function fetchLeverText(platform) {
  const postings = await fetchJson(`https://api.lever.co/v0/postings/${platform.site}?mode=json`);
  const p = postings.find((x) => x.id === platform.externalId);
  if (!p) return null;
  const sections = (p.lists || []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join('\n\n');
  return [htmlToText(p.description), sections].filter(Boolean).join('\n\n');
}

async function fetchAshbyText(platform) {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${platform.org}`);
  const j = (data.jobs || []).find((x) => x.id === platform.externalId);
  if (!j) return null;
  return j.descriptionPlain || htmlToText(j.descriptionHtml);
}

export async function detail(site, item) {
  const base = {
    siteKey: site.key,
    title: item.title,
    location: item.location,
    url: item.url,
    company: item.company,
    remoteType: item.remoteType,
    updatedAt: item.updatedAt,
  };

  if (!item.platform) {
    return makeRecord({ ...base, ats: 'todas-as-vagas', externalId: item.externalId, text: UNRESOLVED_TEXT });
  }

  let text = null;
  try {
    if (item.platform.ats === 'gupy') text = await fetchGupyText(item.platform);
    else if (item.platform.ats === 'greenhouse') text = await fetchGreenhouseText(item.platform);
    else if (item.platform.ats === 'lever') text = await fetchLeverText(item.platform);
    else if (item.platform.ats === 'ashby') text = await fetchAshbyText(item.platform);
  } catch {
    text = null; // origin page changed shape or is temporarily down — fall back below, don't fail the whole batch
  }

  return makeRecord({
    ...base,
    // Gupy rows deliberately record under gupy-portal's own siteKey too —
    // both halves of the (ats, siteKey, externalId) triple must match what
    // resolvedIdFor() precomputed, or this collapses into gupy-portal's
    // dedup entries in list() but not here, reopening the drift bug
    // paradigm.js warns about.
    siteKey: item.platform.ats === 'gupy' ? 'gupy-portal' : site.key,
    ats: item.platform.ats,
    externalId: platformExternalId(item.platform),
    text: text || UNRESOLVED_TEXT,
  });
}
