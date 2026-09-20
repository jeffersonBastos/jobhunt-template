// jobs.x-team.com is a Gatsby SPA backed by a custom Bullhorn integration
// (not a standard ATS token). Its own frontend bundle calls a public,
// unauthenticated JSON endpoint to render "Browse Open Roles" for anonymous
// visitors — reverse-engineered from app-*.js served at jobs.x-team.com,
// confirmed live 2026-07-27 (52 open postings, full HTML description per
// job, no separate detail call needed). Same approach as cow-careers.js.
//   POST https://jobs-bh.x-team.com/bh-api-handler  {"method":"searchJobs"}
// Confirmed against the same bundle: this method is hard-coded as always-
// public (no auth/Bearer token attached even when logged in), and the real
// frontend calls it with no start/count/page/search params — the response's
// total === count, so this single call already returns the complete list.
// `location` is always null in the raw data; region is embedded in the
// title text instead (e.g. "(India)", "(Latam)", "(Mexico & Brazil)").
// X-Team's whole model is remote-first ("Build Without Borders"), so
// remoteType is hardcoded rather than derived from a per-job field.

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const API_URL = 'https://jobs-bh.x-team.com/bh-api-handler';
const API_KEY = 'NCxSIXanpi5ys2isi7eSU0uiUbAcHIX2bKIpviyd';

export const sortedByRecency = true; // sorted client-side by dateLastModified desc, see list()

export async function list(site) {
  const res = await fetchJson(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ method: 'searchJobs' }),
  });
  const jobs = (res.data?.data || []).filter((j) => j.isOpen && j.isPublic);
  const items = jobs.map((j) =>
    makeRecord({
      ats: 'x-team',
      siteKey: site.key,
      company: site.company,
      externalId: j.id,
      title: j.customText5,
      location: j.location || 'unknown',
      remoteType: 'remote',
      department: j.categories?.data?.[0]?.name || null,
      url: `https://jobs.x-team.com/jobs/${j.id}/`,
      text: htmlToText(j.publicDescription),
      updatedAt: j.dateLastModified ? new Date(j.dateLastModified).toISOString() : null,
    }),
  );
  items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return items;
}

export async function detail(site, item) {
  return item; // already a full record; not expected to be called
}
