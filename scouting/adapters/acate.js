// ACATE (Associação Catarinense de Tecnologia) posts its careers page through
// a third-party embed, NOT its own WordPress site. www.acate.com.br itself
// sits behind a Cloudflare bot-challenge (403, cf-mitigated: challenge, on a
// plain GET with a normal desktop UA) and its robots.txt explicitly disallows
// ClaudeBot for the entire site (Disallow: /) — confirmed live 2026-07-29.
// This adapter deliberately never sends a single request to acate.com.br for
// that reason; you (the tool's owner) explicitly authorized attempting
// this source anyway, but only via a legitimately separate, unrestricted
// domain, never by routing around acate.com.br's own block.
//
// The real job data lives somewhere else entirely. Since the live /vagas/
// page 403s, its markup was read from a Wayback Machine snapshot
// (2026-03-22) instead: it embeds an <iframe> pointing at
//   https://www.enlizt.me/aggregator/acate/positions
// "Enlizt" is Plooral's job-aggregator widget product ("Powered by Plooral"
// in the widget's own footer; ACATE's page separately promotes "nossa
// parceria com a Plooral" for members who want to publish jobs there).
// www.enlizt.me's own robots.txt only disallows /lib/, /app/, /css/,
// /templates/ — no bot names, no site-wide block — confirmed live with a
// default curl User-Agent, no auth, no challenge.
//
// Pagination: ?category=undefined&company=undefined&location=undefined&page=N
// — all three params must be present verbatim (including the literal string
// "undefined") or the server ignores `page` and silently always returns page
// 1's content — confirmed by diffing a bare ?page=2 (identical to page 1)
// against the exact query string the widget's own "Próxima"/page-number
// links use (genuinely different jobs). Confirmed 85 unique postings across
// pages 1-5, all unique; page 6 returns zero position-cards, which is the
// real end-of-results signal (a "Próxima" link's presence isn't reliable to
// check — simpler to just stop on an empty page).
//
// The listing HTML's position-card blocks only carry company/title/location
// as display text, no stable per-job ID — the detail-page URL slug ends in
// what looks like a DDMMYY posting-date stamp (matches datePosted), not a
// real ID. So list() only extracts the detail URL and uses it as the
// externalId; detail() does the real work by fetching each company's own
// <company>.enlizt.me/vagas/<slug> page, which embeds a clean schema.org
// JobPosting JSON-LD block (title, full HTML description, datePosted,
// hiringOrganization, jobLocation, jobLocationType) — confirmed on
// nextar.enlizt.me, same permissive robots.txt pattern as www.enlizt.me
// (spot-checked on this one company subdomain, not exhaustively verified
// across all ~85 postings' companies).
//
// That JSON-LD has its own `identifier.value` (a UUID) which looks like the
// "real" internal job ID, but it is NOT used as externalId here: list()
// already commits to the URL as externalId for its hasSeen() dedup check
// (see scout.js's cmdFetch), and detail() must produce the same id or every
// already-seen posting would look "new" again on every future run. URL is
// stable enough for a live posting.
//
// No department/category field exists per-job in either payload (the
// listing's "category" dropdown is a search filter, not a tag returned per
// posting) — left null, same precedent as paradigm/x-team/turing; classify
// sorts on title/text alone. Worth noting: ACATE's board aggregates jobs
// across its WHOLE member ecosystem (agri-tech, accounting, healthcare,
// consulting gigs — "Banco de Especialistas"/"Fornecedor" listings, not just
// software roles), so expect a high non-eng noise ratio, more than a
// single-company adapter.

import { fetchText, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const LIST_URL = 'https://www.enlizt.me/aggregator/acate/positions';
const MAX_PAGES = 20; // hard stop, well above the observed 5 pages

export const sortedByRecency = false; // listing order not confirmed to be recency-based

export async function list() {
  const urls = new Set();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await fetchText(`${LIST_URL}?category=undefined&company=undefined&location=undefined&page=${page}`);
    const found = [...html.matchAll(/class="position-link" href="([^"]+)"/g)].map((m) => m[1]);
    if (!found.length) break;
    found.forEach((u) => urls.add(u));
  }
  return [...urls].map((url) => ({ externalId: url, url }));
}

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export async function detail(site, item) {
  const html = await fetchText(item.url);
  const job = extractJsonLd(html);
  if (!job) throw new Error(`acate: could not extract JobPosting JSON-LD for ${item.url}`);

  const addr = job.jobLocation?.address;
  const location = [addr?.addressLocality, addr?.addressRegion].filter(Boolean).join(', ') || 'unknown';

  return makeRecord({
    ats: 'acate',
    siteKey: site.key,
    company: job.hiringOrganization?.name || site.company,
    externalId: item.externalId, // the URL — must match what list() used for its hasSeen() dedup check
    title: job.title || 'unknown',
    location,
    remoteType: job.jobLocationType === 'TELECOMMUTE' ? 'remote' : job.jobLocationType ? 'onsite' : 'unknown',
    department: null,
    url: item.url,
    text: htmlToText(job.description),
    updatedAt: job.datePosted || null,
  });
}
