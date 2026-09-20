// work.turing.com is a Next.js SPA — a plain GET on /jobs returns an empty
// client-side-rendered shell (BAILOUT_TO_CLIENT_SIDE_RENDERING), no job data
// in the HTML. But its own frontend bundle calls a public, unauthenticated
// JSON API to render the listing, confirmed live 2026-07-29 with a default
// curl User-Agent, no cookies, no auth (site sits behind Imperva/Incapsula
// but didn't challenge any of these calls):
//   POST https://work.turing.com/api/jobs/all
//     body {searchQuery, expertise:[], location:[], currentPage, pageSize}
//     -> {success, jobs:[...], totalCount, ...}
// `pageSize` is honored as a real cap (confirmed: pageSize=10 returns
// exactly 10 of 158) but `currentPage` is silently ignored by the API —
// page 1 and page 2 return byte-identical job lists (confirmed by diffing
// both with a small pageSize). A currentPage-driven pagination loop was
// tried first and it silently duplicated the same jobs into `jobs.length`
// until that hit `totalCount`, reporting double the real posting count.
// The actual fix: request a single page with pageSize comfortably above the
// live totalCount (confirmed: pageSize=300 against a totalCount of 158
// returns exactly 158 unique ids) — same one-call shape as x-team, just
// with an oversized pageSize instead of no pageSize param at all.
//
// Each job in the list response already carries full description + skills
// (confirmed: same HTML content as the separate GET /api/job/public?jobId=
// detail endpoint) — no per-job detail call needed, same shortcut as x-team.
//
// No city/country field anywhere in the payload — only `locationType`
// ("remote" | "on-site" | null). Turing's whole model is short-term
// freelance/contractor work (see `contract`/`engagement_type` framing in the
// detail payload), open globally, so `location` is left 'unknown' rather
// than guessed; region inference will default these to "intl", which is a
// reasonable fallback since Turing doesn't restrict by country.
//
// `roleGroup` is the only department-like facet, but it's mixed
// (Engineering, ML/Data Engineering, Cloud & Infrastructure, Software
// development, Data Scientist/Analyst, Analyst, Business, Finance, Legal &
// Law Services, Healthcare & Medical, Media & Communication, Linguistics,
// Other, Science) — too many eng-adjacent buckets for the single-substring
// `department_includes` filter, so left unfiltered like paradigm/gupy-portal/
// x-team; classify sorts the non-eng noise.
//
// Job detail URL confirmed by reading the frontend's own "copy link" handler
// (chunk cab15b8f74e675b2.js): it does
// `new URL(window.location.href); url.searchParams.set('jobId', job.id)`
// against the /jobs page itself (a client-side modal, not a separate route)
// — so https://work.turing.com/jobs?jobId=<id> is the real shareable link,
// confirmed to 200 (a guessed /jobs/<id> or /job/<id> path 404s).

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const API_URL = 'https://work.turing.com/api/jobs/all';
// Comfortably above the live totalCount (158 as of 2026-07-29) — currentPage
// doesn't work here, so this single oversized request is what actually
// pages the whole listing. Re-check this margin if `jobs.length` below ever
// comes back suspiciously equal to this number (a sign totalCount grew past
// it and results are being truncated).
const PAGE_SIZE = 1000;

export const sortedByRecency = true; // sorted client-side by createdDate desc, see list()

function mapRemoteType(locationType) {
  if (locationType === 'remote') return 'remote';
  if (locationType === 'on-site') return 'onsite';
  return 'unknown';
}

export async function list(site) {
  const res = await fetchJson(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ searchQuery: '', expertise: [], location: [], currentPage: 1, pageSize: PAGE_SIZE }),
  });
  if (!res.success) throw new Error('turing: API returned success=false');
  const jobs = res.jobs || [];
  if (res.totalCount && jobs.length < res.totalCount) {
    throw new Error(`turing: fetched ${jobs.length} of ${res.totalCount} — PAGE_SIZE margin no longer covers totalCount, needs raising`);
  }

  const items = jobs.map((j) =>
    makeRecord({
      ats: 'turing',
      siteKey: site.key,
      company: site.company,
      externalId: j.id,
      title: j.title,
      location: 'unknown',
      remoteType: mapRemoteType(j.locationType),
      department: j.roleGroup || null,
      url: `https://work.turing.com/jobs?jobId=${j.id}`,
      text: [j.oneLinerDescription, htmlToText(j.description)].filter(Boolean).join('\n\n'),
      // Timezone of createdDate ("YYYY-MM-DD HH:MM:SS") is unconfirmed, so
      // this is parsed as-is rather than assuming UTC — good enough for
      // relative sort order, not claimed as an exact instant.
      updatedAt: j.createdDate ? new Date(j.createdDate.replace(' ', 'T')).toISOString() : null,
    }),
  );
  items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return items;
}

export async function detail(site, item) {
  return item; // already a full record; not expected to be called
}
