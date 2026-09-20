// Ashby job boards expose a public, unauthenticated JSON API that returns the
// full postings list WITH description text (HTML + plain) in one call — no
// separate detail fetch needed, same shape as Lever. Confirmed live against
// jobs.ashbyhq.com/phantom.
//   https://api.ashbyhq.com/posting-api/job-board/{orgSlug}

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

export const sortedByRecency = true; // sorted client-side by publishedAt desc, see list()

export async function list(site) {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${site.org}`);
  const items = (data.jobs || []).map((j) =>
    makeRecord({
      ats: 'ashby',
      siteKey: site.key,
      company: site.company,
      externalId: j.id,
      title: j.title,
      location: j.location || 'unknown',
      remoteType: j.isRemote ? 'remote' : j.workplaceType || 'unknown',
      department: j.department || j.team || null,
      url: j.jobUrl,
      text: j.descriptionPlain || htmlToText(j.descriptionHtml),
      updatedAt: j.publishedAt || null,
    }),
  );
  items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return items;
}

export async function detail(site, item) {
  return item; // already a full record; not expected to be called
}
