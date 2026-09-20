// Greenhouse job boards expose a public, unauthenticated JSON API:
//   list:   https://boards-api.greenhouse.io/v1/boards/{token}/jobs
//   detail: https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{id}?content=true
// Confirmed against iFood (token: ifoodcarreiras).

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

export const sortedByRecency = true; // we sort client-side by updated_at desc, see list()

export async function list(site) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${site.token}/jobs`);
  const items = (data.jobs || []).map((j) => ({
    externalId: String(j.id),
    title: j.title,
    location: j.location?.name || 'unknown',
    updatedAt: j.updated_at || null,
  }));
  items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return items;
}

export async function detail(site, item) {
  const job = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${site.token}/jobs/${item.externalId}?content=true`,
  );
  const departments = (job.departments || []).map((d) => d.name).join(', ');
  const offices = (job.offices || []).map((o) => o.name).join(', ');
  const text = [`Department: ${departments}`, `Office: ${offices}`, htmlToText(job.content)]
    .filter(Boolean)
    .join('\n\n');

  return makeRecord({
    ats: 'greenhouse',
    siteKey: site.key,
    company: site.company,
    externalId: item.externalId,
    title: job.title,
    location: job.location?.name || item.location,
    remoteType: /remote/i.test(`${offices} ${departments}`) ? 'remote' : 'unknown',
    department: departments || null,
    url: job.absolute_url,
    text,
    updatedAt: job.updated_at,
  });
}
