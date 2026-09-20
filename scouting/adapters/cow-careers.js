// cow.fi/careers is a small Next.js (App Router) page. Its job listing is
// embedded directly in the page's RSC payload (self.__next_f.push(...)) — no
// separate API call needed. Confirmed live: 2 open roles, matching what
// you already reviewed manually (Business Development Manager, Staff
// Backend Engineer (Rust), both Remote).
//
// No per-job detail page was found — the obvious guess (/careers/{id}) 404s,
// and there's no visible API for individual postings. With no full
// description text to judge against the checklist, and only a handful of
// roles at a time, this behaves like the CoW forum watcher: classify:false,
// just surface new postings directly for a manual look.
//
// Extraction is a flat regex over the still-escaped JSON in the RSC payload
// (each job object is a self-contained, non-nested match) rather than a full
// JSON parse — the payload is a JS string literal with escaped quotes, and
// unescaping the whole blob just to re-parse it is unnecessary when the
// fields we need never contain literal backslashes.

import { fetchText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

export const sortedByRecency = false;

const JOB_RE = /\{\\"id\\":\\"([0-9a-f-]{36})\\",\\"title\\":\\"([^\\]*)\\",\\"teamId\\":\\"[0-9a-f-]{36}\\",\\"locationName\\":\\"([^\\]*)\\",\\"employmentType\\":\\"([^\\]*)\\"\}/g;

export async function list(site) {
  const html = await fetchText(site.list_url);
  const rows = [];
  let m;
  while ((m = JOB_RE.exec(html))) {
    const [, id, title, location, employmentType] = m;
    rows.push(
      makeRecord({
        ats: 'cow-careers',
        siteKey: site.key,
        company: site.company,
        externalId: id,
        title,
        location,
        remoteType: /remote/i.test(location) ? 'remote' : 'unknown',
        url: site.list_url, // no per-job page found; link back to the listing
        text: `${employmentType} — no per-job description page found; check the listing directly.`,
        updatedAt: null,
      }),
    );
  }
  return rows;
}

export async function detail(site, item) {
  return item; // list() already returns full records
}
