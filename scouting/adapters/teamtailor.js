// Generic Teamtailor ATS adapter — Teamtailor is a multi-tenant careers
// platform, so this reads everything it needs from `site.list_url` rather
// than hardcoding a company. Confirmed live 2026-09-13 against Reap
// (careers.reap.global/jobs), see tasks/done/reap-teamtailor-adapter.md for
// the discovery trail.
//
// List page is server-rendered HTML with every job's absolute URL already
// embedded as a plain `<a href="<list_url>/<id>-<slug>">`. Pagination is
// `<list_url>/show_more?page=N` (increment until a page returns 0 new
// links). Per-job detail page has a standard JSON-LD `<script
// type="application/ld+json">` block (`@type: "JobPosting"`).
//
// `applicantLocationRequirements` isn't trusted blindly — Reap's postings
// showed it stuck on Teamtailor's own HQ default ("Hong Kong") even for
// LATAM-titled roles — so it's kept as a text hint alongside the title/
// description rather than used to set `location` directly.

import { fetchText, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

function jobLinkPattern(listUrl) {
  const escaped = listUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}/([0-9]+)-[^"]+`, 'g');
}

export async function list(site) {
  const linkPattern = jobLinkPattern(site.list_url);
  const byId = new Map();

  const firstPage = await fetchText(site.list_url);
  for (const m of firstPage.matchAll(linkPattern)) {
    byId.set(m[1], m[0]);
  }

  for (let page = 2; ; page++) {
    const html = await fetchText(`${site.list_url}/show_more?page=${page}`);
    let found = 0;
    for (const m of html.matchAll(linkPattern)) {
      if (byId.has(m[1])) continue;
      found++;
      byId.set(m[1], m[0]);
    }
    if (found === 0) break;
  }

  return [...byId.entries()].map(([externalId, url]) => ({ externalId, url }));
}

export async function detail(site, item) {
  const html = await fetchText(item.url);
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  // Some Reap postings embed raw control characters (literal newlines) inside
  // a JSON string value (e.g. job 6467285) — invalid per strict JSON, but
  // always insignificant whitespace in this position (either between tokens,
  // where it's harmless, or standing in for an HTML `<br>` inside the
  // HTML-entity-escaped description text, where a space is the right stand-in).
  const posting = m ? JSON.parse(m[1].replace(/[\x00-\x1f]/g, ' ')) : null;

  const locationHint = posting?.applicantLocationRequirements?.name;

  return makeRecord({
    ats: 'teamtailor',
    siteKey: site.key,
    company: site.company,
    externalId: item.externalId,
    title: posting?.title || 'unknown',
    location: locationHint || 'unknown',
    remoteType: 'unknown',
    department: null,
    url: item.url,
    text: htmlToText(posting?.description),
    updatedAt: posting?.datePosted || null,
  });
}
