// forum.cow.fi is a Discourse forum — any page has a clean JSON twin at the
// same path + `.json`. Confirmed live:
//   https://forum.cow.fi/search.json?q=RFP%20order%3Alatest
// returns { topics: [...], posts: [...] } directly, already filtered by the
// query. No HTML scraping, no title filtering needed (the search query does
// the filtering) — this is a much simpler source than a career page: there's
// no "fit" judgment to make, just "is this a topic I haven't seen yet."
//
// `order:latest` sorts by last activity (bumped_at), not creation date, so
// the list is NOT reliably newest-created-first — sortedByRecency stays
// false and every run scans the full (cheap, single-call) result set.

import { fetchJson } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

export const sortedByRecency = false;

export async function list(site) {
  const data = await fetchJson(site.list_url);
  return (data.topics || []).map((t) =>
    makeRecord({
      ats: 'discourse',
      siteKey: site.key,
      company: site.company,
      externalId: t.id,
      title: t.title,
      location: 'n/a',
      remoteType: 'n/a',
      url: `https://forum.cow.fi/t/${t.slug}/${t.id}`,
      text: t.excerpt || '',
      updatedAt: t.last_posted_at || t.created_at,
    }),
  );
}

export async function detail(site, item) {
  return item; // list() already returns full records
}
