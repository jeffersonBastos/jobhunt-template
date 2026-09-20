// Generic Workday (CXS = "Careers Experience Service") adapter — any
// Workday-hosted careers site follows the same
// `<tenant>.wd<N>.myworkdayjobs.com/<locale>/<siteId>` shape and exposes a
// public, unauthenticated JSON API the SPA itself calls, so this adapter
// derives tenant/site/locale from `site.list_url` rather than hardcoding a
// company. Confirmed live 2026-09-13 against Booz Allen Hamilton
// (bah.wd1.myworkdayjobs.com/en-US/BAH_Jobs), see
// tasks/done/boozallen-workday-adapter.md for the discovery trail.
//
//   POST https://<host>/wday/cxs/<tenant>/<siteId>/jobs
//     {"appliedFacets": {...}, "limit": N, "offset": N, "searchText": "..."}
//   GET  https://<host>/wday/cxs/<tenant>/<siteId><externalPath>
//
// A company-wide, unfiltered Workday board is typically thousands of
// postings (2000 for Booz Allen) — too many to run through classify. Same
// pattern as gupy-portal.js: `site.queries` is a hand-curated keyword list,
// one `searchText` POST per term, merged and deduped by requisition id
// (`jobPostingInfo.jobReqId`, e.g. R0238021) since the same posting can
// match multiple terms. `site.facets` (optional) is passed through as
// `appliedFacets` on every query — facet ids are tenant-specific (found via
// an unfiltered request's own `facets` array), so this adapter never
// hardcodes one.

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const DEFAULT_LIMIT = 20;

function siteParts(listUrl) {
  const url = new URL(listUrl);
  const host = url.hostname;
  const tenant = host.split('.')[0];
  const [, locale, siteId] = url.pathname.split('/'); // "/en-US/BAH_Jobs" -> ["", "en-US", "BAH_Jobs"]
  return {
    host,
    tenant,
    siteId,
    locale,
    cxsBase: `https://${host}/wday/cxs/${tenant}/${siteId}`,
    publicBase: `https://${host}/${locale}/${siteId}`,
  };
}

export const sortedByRecency = false; // merged from independent per-term searches, same reasoning as gupy-portal.js

export async function list(site) {
  const { cxsBase, publicBase } = siteParts(site.list_url);
  const facets = site.facets || {};
  const limit = site.limit || DEFAULT_LIMIT;
  const queries = site.queries && site.queries.length ? site.queries : [''];

  const byReq = new Map();
  for (const term of queries) {
    for (let offset = 0; ; offset += limit) {
      const res = await fetchJson(`${cxsBase}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appliedFacets: facets, limit, offset, searchText: term }),
      });
      const postings = res.jobPostings || [];
      for (const jp of postings) {
        const externalId = jp.bulletFields?.[0] || jp.externalPath;
        if (byReq.has(externalId)) continue; // same req often matches multiple search terms
        byReq.set(externalId, {
          externalId,
          title: jp.title,
          location: jp.locationsText || 'unknown',
          externalPath: jp.externalPath,
          url: `${publicBase}${jp.externalPath}`,
        });
      }
      if (postings.length === 0 || offset + limit >= res.total) break;
    }
  }
  return [...byReq.values()];
}

export async function detail(site, item) {
  const { cxsBase } = siteParts(site.list_url);
  const data = await fetchJson(`${cxsBase}${item.externalPath}`);
  const jp = data.jobPostingInfo || {};

  return makeRecord({
    ats: 'workday',
    siteKey: site.key,
    company: site.company,
    externalId: jp.jobReqId || item.externalId,
    title: jp.title || item.title,
    location: jp.location || item.location,
    remoteType: 'unknown',
    department: null,
    url: item.url,
    text: htmlToText(jp.jobDescription),
    updatedAt: null, // postedOn is relative text ("Posted 3 Days Ago"), not a real timestamp
  });
}
