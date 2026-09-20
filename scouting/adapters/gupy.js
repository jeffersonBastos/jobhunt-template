// Gupy career pages (very common among Brazilian companies) are Next.js apps
// that server-render full data into a __NEXT_DATA__ JSON blob — no API token
// needed. Confirmed live against ambevtech.gupy.io.
//   list:   https://{subdomain}.gupy.io/{?query filters}     -> props.pageProps.jobs[]
//   detail: https://{subdomain}.gupy.io/jobs/{id}            -> props.pageProps.job
// `job.prerequisites` is the required-quals section specifically (more
// pre-structured than Greenhouse/Lever, which blend everything into one blob).
//
// Not yet validated end-to-end in this project's registry — no company here
// uses Gupy yet. Site config needs: { subdomain, list_url }.

import { fetchText, htmlToText, extractNextData } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

export const sortedByRecency = false; // listing order not confirmed to be recency-based

export async function list(site) {
  const html = await fetchText(site.list_url);
  const data = extractNextData(html);
  const jobs = data?.props?.pageProps?.jobs || [];
  return jobs.map((j) => ({
    externalId: String(j.id),
    title: j.title,
    location: [j.workplace?.address?.city, j.workplace?.address?.stateShortName].filter(Boolean).join(', ') || 'unknown',
    department: j.department || null,
    updatedAt: null,
  }));
}

export async function detail(site, item) {
  const html = await fetchText(`https://${site.subdomain}.gupy.io/jobs/${item.externalId}`);
  const data = extractNextData(html);
  const job = data?.props?.pageProps?.job;
  if (!job) throw new Error(`gupy: could not extract job data for id ${item.externalId}`);

  const text = [
    htmlToText(job.description),
    job.prerequisites ? `Requirements:\n${htmlToText(job.prerequisites)}` : '',
    job.responsibilities ? `Responsibilities:\n${htmlToText(job.responsibilities)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return makeRecord({
    ats: 'gupy',
    siteKey: site.key,
    company: site.company,
    externalId: item.externalId,
    title: job.name || item.title,
    location: [job.addressCity, job.addressStateShortName].filter(Boolean).join(', ') || item.location,
    remoteType: /remote|home.?office/i.test(job.workplaceType || '') ? 'remote' : 'unknown',
    department: item.department || null, // not present on the detail payload, carried from list()
    url: `https://${site.subdomain}.gupy.io/jobs/${item.externalId}`,
    text,
    updatedAt: job.publishedAt || null,
  });
}
