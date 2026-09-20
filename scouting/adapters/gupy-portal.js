// Gupy's own marketplace portal (portal.gupy.io/job-search) — NOT the same
// thing as adapters/gupy.js, which handles a single company's Gupy-hosted
// subdomain (e.g. ambevtech.gupy.io). This is Gupy's aggregator across every
// company that uses Gupy in Brazil (~85k postings total, all industries), so
// like adapters/paradigm.js it needs a pre-filter before anything reaches
// classify — here that's server-side keyword search, not a client regex.
//
// The portal page itself is a Next.js SPA that ships an empty shell (no jobs
// in __NEXT_DATA__, unlike the single-company Gupy pages) and fetches jobs
// client-side. Found the real call by downloading the page's JS chunks and
// grepping for API strings:
//   GET https://employability-portal.gupy.io/api/v1/jobs
//     ?jobName=<term>&type=<comma-separated>&limit=<n>&offset=<n>
//     &sortBy=publishedDate&sortOrder=desc
// Public, unauthenticated — confirmed live. Response: { data: [...], pagination }.
// Each job already includes full plain-text `description` — no separate
// detail() fetch needed (simpler than gupy.js's list+detail round trip).
//
// `type` filters out noise at 0 classify-token cost: vacancy_type_apprentice
// (Jovem Aprendiz), vacancy_type_internship (estágio), and
// vacancy_type_talent_pool (banco de talentos, not a real open req) are
// excluded by omission. vacancy_type_effective also covers BR "programa
// trainee" postings (real hires) — those correctly still flow through to
// classify, per the checklist's existing rule that experience-level gaps are
// a classify-time judgment, not a pre-filter.
//
// site.queries (config/sites.yaml) is a hand-curated list of PT-BR search
// terms — jobName matches title/body, so terms are deliberately broad
// (e.g. "backend", "node.js") rather than exact title strings. The same job
// commonly matches multiple terms; list() dedupes by job id before anything
// reaches scout.js.

import { fetchJson, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const API_BASE = 'https://employability-portal.gupy.io/api/v1/jobs';
const DEFAULT_TYPES = ['vacancy_type_effective', 'vacancy_type_associate'];
const DEFAULT_LIMIT = 30;

// Merges results from several independent term-searches, each its own
// newest-first stream — not a single reliable global order the way one
// company's own listing is, so (like paradigm.js) this stays false. The
// merged array is still sorted by publishedDate below for readability, but
// scout.js no longer early-exits on this flag (see its cmdFetch comment on
// why that was removed) — it's informational only at this point.
export const sortedByRecency = false;

function normalizeWorkplaceType(workplaceType, isRemoteWork) {
  if (workplaceType === 'remote' || isRemoteWork) return 'remote';
  if (workplaceType === 'hybrid') return 'hybrid';
  if (workplaceType === 'on-site') return 'onsite';
  return 'unknown';
}

export async function list(site) {
  const queries = site.queries || [];
  const types = (site.types || DEFAULT_TYPES).join(',');
  const limit = site.limit || DEFAULT_LIMIT;

  const byId = new Map();
  for (const term of queries) {
    const url = `${API_BASE}?jobName=${encodeURIComponent(term)}&type=${encodeURIComponent(types)}&limit=${limit}&offset=0&sortBy=publishedDate&sortOrder=desc`;
    const res = await fetchJson(url);
    for (const job of res.data || []) {
      if (byId.has(String(job.id))) continue; // same job often matches multiple terms
      byId.set(
        String(job.id),
        makeRecord({
          ats: 'gupy-portal',
          siteKey: site.key,
          company: job.careerPageName || 'Unknown', // per-row, aggregator-style — not site.company
          externalId: job.id,
          title: job.name,
          location: [job.city, job.state].filter(Boolean).join(', ') || job.country || 'unknown',
          remoteType: normalizeWorkplaceType(job.workplaceType, job.isRemoteWork),
          department: null, // not present on this payload
          url: job.jobUrl,
          text: htmlToText(job.description),
          updatedAt: job.publishedDate || null,
        }),
      );
    }
  }

  return [...byId.values()].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export async function detail(site, item) {
  return item; // already a full record; not expected to be called
}
