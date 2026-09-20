// Paradigm's careers page (paradigm.xyz/careers) is NOT a single company's
// board — it's an aggregator listing open roles across their entire
// portfolio (2000+ postings from dozens of companies), server-rendered
// directly into the HTML (no JS execution needed to read it). Confirmed live.
//
// Each row is `<a class="job-link ..." href="..." aria-label="Company – Title">`
// with `meta-item--location`/`meta-item--posted` spans inside. The class name
// is a Svelte build hash and may drift if Paradigm redeploys their site —
// this is exactly the kind of site-specific fragility expected for an
// aggregator like this, unlike a direct ATS API.
//
// Most of the 2000+ postings are irrelevant (portfolio spans hardware,
// manufacturing, sales, etc.) — Stage B applies a title keyword filter before
// anything else happens, same spirit as department_includes elsewhere.
//
// For rows whose URL resolves to a platform we already support (Greenhouse
// direct, Lever, Ashby), we fetch full text the normal way. Everything else
// (custom company career pages, or Greenhouse embedded via a bare `gh_jid`
// query param on a custom domain where the board token isn't in the URL) is
// intentionally NOT resolved — those come back as a thin "unresolved" record
// so they surface in the report for a manual look instead of being fetched
// unreliably or silently dropped.

import { fetchText, fetchJson, htmlToText } from './_base.js';
import { makeRecord, makeId } from '../lib/normalize.js';

export const sortedByRecency = false; // aggregates many companies; no single reliable global order

// The externalId string a resolved row will be recorded under once detail()
// runs — shared by list() (to precompute the dedupe id below) and detail()
// (to build the actual record), so the two can never drift out of sync
// again. Bug history: list() used to dedupe on `ats:'paradigm'` + href while
// detail() recorded under `ats:<resolved platform>` + this string, so the
// hasSeen() check in scout.js's cmdFetch never matched what finalize had
// actually stored — every resolved posting (the majority of Paradigm's
// traffic) was re-fetched and re-classified on every run, silently
// clobbering your manual corrections each time (confirmed live: 4
// manually-corrected verdicts reverted within 2 days).
function platformExternalId(platform) {
  const ns = platform.token ?? platform.site ?? platform.org;
  return `paradigm:${ns}:${platform.externalId}`;
}

const ROW_RE = /<a class="job-link[^"]*" href="([^"]+)"[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
const DEFAULT_TITLE_FILTER =
  /\b(software engineer|backend|full.?stack|fullstack|swe|platform engineer|infrastructure engineer|smart contract|blockchain engineer|solidity|site reliability|devops engineer|node\.?js)\b/i;

const UNRESOLVED_TEXT = '(custom career page — could not auto-extract the description; check the link manually)';

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function resolvePlatform(url) {
  let m;
  if ((m = url.match(/job-boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/))) {
    return { ats: 'greenhouse', token: m[1], externalId: m[2] };
  }
  if ((m = url.match(/jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/i))) {
    return { ats: 'lever', site: m[1], externalId: m[2] };
  }
  if ((m = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([0-9a-f-]{36})/i))) {
    return { ats: 'ashby', org: m[1], externalId: m[2] };
  }
  return null; // custom domain, bare gh_jid on a non-greenhouse.io host, etc.
}

export async function list(site) {
  const html = await fetchText(site.list_url);
  const titleFilter = site.title_includes ? new RegExp(site.title_includes, 'i') : DEFAULT_TITLE_FILTER;

  const rows = [];
  let m;
  while ((m = ROW_RE.exec(html))) {
    const [, href, ariaLabel, block] = m;
    const label = decodeEntities(ariaLabel);
    if (!titleFilter.test(label)) continue;

    const sep = label.indexOf(' – ');
    const company = sep === -1 ? 'Unknown' : label.slice(0, sep);
    const title = sep === -1 ? label : label.slice(sep + 3);
    const locM = block.match(/meta-item--location[^"]*">([^<]*)</);
    const platform = resolvePlatform(href);

    rows.push({
      externalId: href, // href is unique enough to serve as the paradigm-level id
      title,
      company,
      location: locM ? decodeEntities(locM[1]) : 'unknown',
      url: href,
      platform,
      // Precomputed so cmdFetch's hasSeen() check (before detail() ever
      // runs) uses the exact same id detail() will record under — no extra
      // network call needed, resolvePlatform() already ran above.
      resolvedId: platform ? makeId(platform.ats, site.key, platformExternalId(platform)) : null,
    });
  }
  return rows;
}

export async function detail(site, item) {
  // siteKey stays 'paradigm' (the discovery source) regardless of the
  // underlying platform, so ids stay namespaced to this aggregator even
  // though `ats` below reports the real platform for a readable report.
  const base = { siteKey: site.key, title: item.title, location: item.location, url: item.url, company: item.company };

  if (!item.platform) {
    return makeRecord({ ...base, ats: 'paradigm', externalId: item.externalId, remoteType: 'unknown', text: UNRESOLVED_TEXT, updatedAt: null });
  }

  if (item.platform.ats === 'greenhouse') {
    const job = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${item.platform.token}/jobs/${item.platform.externalId}?content=true`);
    const departments = (job.departments || []).map((d) => d.name).join(', ');
    return makeRecord({
      ...base,
      ats: 'greenhouse',
      externalId: platformExternalId(item.platform),
      title: job.title || item.title,
      location: job.location?.name || item.location,
      remoteType: /remote/i.test(departments) ? 'remote' : 'unknown',
      department: departments || null,
      text: htmlToText(job.content),
      updatedAt: job.updated_at,
    });
  }

  if (item.platform.ats === 'lever') {
    const p = await fetchJson(`https://api.lever.co/v0/postings/${item.platform.site}/${item.platform.externalId}?mode=json`);
    const sections = (p.lists || []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join('\n\n');
    return makeRecord({
      ...base,
      ats: 'lever',
      externalId: platformExternalId(item.platform),
      title: p.text || item.title,
      remoteType: p.workplaceType || 'unknown',
      department: p.categories?.team || null,
      text: [htmlToText(p.description), sections].filter(Boolean).join('\n\n'),
      updatedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    });
  }

  if (item.platform.ats === 'ashby') {
    const boardData = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${item.platform.org}`);
    const job = (boardData.jobs || []).find((j) => j.id === item.platform.externalId);
    if (!job) throw new Error(`paradigm/ashby: job ${item.platform.externalId} not found on board ${item.platform.org}`);
    return makeRecord({
      ...base,
      ats: 'ashby',
      externalId: platformExternalId(item.platform),
      title: job.title || item.title,
      remoteType: job.isRemote ? 'remote' : job.workplaceType || 'unknown',
      department: job.department || job.team || null,
      text: job.descriptionPlain || htmlToText(job.descriptionHtml),
      updatedAt: job.publishedAt || null,
    });
  }

  throw new Error(`paradigm: unhandled platform ${item.platform.ats}`);
}
