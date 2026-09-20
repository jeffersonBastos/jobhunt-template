// Lever job boards expose a public, unauthenticated JSON API that returns the
// full postings list WITH description text in a single call — no separate
// detail fetch needed. Confirmed live against jobs.lever.co/whoop.
//   https://api.lever.co/v0/postings/{site}?mode=json
// EU-hosted tenants use api.eu.lever.co (set `region: eu` on the site config).
//
// Not yet validated against a real target in this project's registry — the
// shape below matches a live response, but no company here uses Lever yet.

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

export const sortedByRecency = true; // sorted client-side by createdAt desc, see list()

function apiBase(site) {
  return site.region === 'eu' ? 'https://api.eu.lever.co' : 'https://api.lever.co';
}

// Lever's list call already returns full canonical records (description
// included) — the orchestrator skips calling detail() when list() items
// already carry an `id`.
export async function list(site) {
  const postings = await fetchJson(`${apiBase(site)}/v0/postings/${site.site}?mode=json`);
  const items = postings.map((p) => {
    const sections = (p.lists || [])
      .map((l) => `${l.text}\n${htmlToText(l.content)}`)
      .join('\n\n');
    const text = [htmlToText(p.description), sections].filter(Boolean).join('\n\n');
    return makeRecord({
      ats: 'lever',
      siteKey: site.key,
      company: site.company,
      externalId: p.id,
      title: p.text,
      location: p.categories?.location || 'unknown',
      remoteType: p.workplaceType || 'unknown',
      department: p.categories?.team || p.categories?.department || null,
      url: p.hostedUrl,
      text,
      updatedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    });
  });
  items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return items;
}

export async function detail(site, item) {
  return item; // already a full record; not expected to be called
}
