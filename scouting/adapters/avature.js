// Generic Avature ATS adapter — Avature is a multi-tenant careers-portal
// platform (like Greenhouse/Lever/Teamtailor), so this reads everything it
// needs from `site.list_url` rather than hardcoding a company. Confirmed
// live 2026-09-13 against Booz Allen Hamilton (careers.boozallen.com), see
// tasks/done/boozallen-avature-adapter.md for the discovery trail.
//
// List page (site.list_url) is server-rendered HTML, no JS needed. Each job
// row is a `<td data-th="Title" class="cell-title"><a href="...JobDetail?
// jobId=N">Title</a></td>` plus a sibling `<td data-th="Location">`.
// Pagination is a `jobOffset` query param (page size taken from the URL's
// own `jobRecordsPerPage`, default 20) — increment until a page returns 0
// new job ids, same stopping condition as reap/teamtailor.
//
// Detail page (JobDetail?jobId=N) embeds a plain (non-JSON-LD-typed)
// `<script type='text/javascript'>{"@context":"http://schema.org",
// "@type":"JobPosting",...}</script>` block with title/description/
// jobLocation — parsed directly as JSON, same fields JSON-LD would carry.
// The requisition number (e.g. R0238026) isn't in that block (its
// `identifier.value` is Avature's own internal jobId) but is embedded in
// the canonical/og:url slug, so it's pulled from there instead.

import { fetchText, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const LIST_ROW_RE = /<td data-th="Title" class="cell-title">\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/gs;
const SCRIPT_RE = /<script type='text\/javascript'>\s*(\{[\s\S]*?"@type":\s*"JobPosting"[\s\S]*?\})\s*<\/script>/;
const REQ_NUMBER_RE = /\b(R\d{6,8})\b/;

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export async function list(site) {
  const base = new URL(site.list_url);
  const pageSize = parseInt(base.searchParams.get('jobRecordsPerPage'), 10) || 20;

  const byId = new Map();
  for (let offset = 0; ; offset += pageSize) {
    const pageUrl = new URL(base.toString());
    pageUrl.searchParams.set('jobOffset', String(offset));
    const html = await fetchText(pageUrl.toString());

    let found = 0;
    for (const m of html.matchAll(LIST_ROW_RE)) {
      const [, href, title] = m;
      const idMatch = href.match(/jobId=(\d+)/);
      if (!idMatch) continue;
      const externalId = idMatch[1];
      if (byId.has(externalId)) continue;
      found++;
      byId.set(externalId, {
        externalId,
        title: decodeEntities(title.trim()),
        url: href.startsWith('http') ? href : new URL(href, base).toString(),
      });
    }
    if (found === 0) break;
  }
  return [...byId.values()];
}

export async function detail(site, item) {
  const html = await fetchText(item.url);
  const m = html.match(SCRIPT_RE);
  const posting = m ? JSON.parse(m[1]) : null;

  const reqMatch = html.match(REQ_NUMBER_RE);
  const address = posting?.jobLocation?.address;
  const location = address
    ? [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', ')
    : 'unknown';

  return makeRecord({
    ats: 'avature',
    siteKey: site.key,
    company: site.company,
    externalId: item.externalId,
    title: posting?.title || item.title,
    location,
    remoteType: /remote work.{0,5}:\s*.?yes/i.test(html) ? 'remote' : 'unknown',
    department: null,
    url: item.url,
    text: [reqMatch ? `Requisition: ${reqMatch[1]}` : null, htmlToText(posting?.description)].filter(Boolean).join('\n\n'),
    updatedAt: posting?.datePosted || null,
  });
}
