// infojobs.com.br is a classic server-rendered ASPX site — a plain GET on a
// search results page (e.g. .../vagas-de-emprego-desenvolvedor.aspx) returns
// real job data in the HTML immediately, no JS execution needed (unlike
// Turing's empty CSR shell). robots.txt has no AI-crawler-specific rules at
// all (no ClaudeBot/GPTBot/CCBot entries), only legacy path exclusions
// (login/account/legal pages) that don't cover job-search paths — confirmed
// live 2026-07-29.
//
// Each listing card is a `<div id="vacancyNNNNNNN" ... data-id="NNNNNNN"
// ... data-href="/vaga-de-...__NNNNNNN.aspx">` — the numeric id is a stable,
// site-assigned job id (unlike ACATE/Enlizt's date-stamped slug), used
// directly as externalId here.
//
// Pagination is classic query-param (`&Page=N`, capital P) — confirmed by
// diffing a broad "desenvolvedor" search's page 1 vs `&Page=2` (20 fully
// different jobs, not a re-render of the same batch) — even though the
// live site also progressively loads more via infinite-scroll JS
// (`js_infiniteScrollLoading` spinner in the markup) once a user scrolls,
// the same underlying pages are reachable with a plain GET and `&Page=N`,
// same shortcut as Greenhouse-style pagination elsewhere in this project.
// `&Page=1` explicitly confirmed identical to the bare list_url (no Page
// param at all), so list() always appends it, including for page 1.
// Termination: the pre-filtered target URL in sites.yaml (isr=11, developer
// + home-office) only has 4 postings total — `&Page=2` on it already
// returns zero job cards, which is the real stop signal (there's no
// "next page" nav to check, same shape as the ACATE/turing stop conditions).
//
// Each job's own detail page (.../vaga-de-...aspx) embeds a clean
// schema.org JobPosting JSON-LD block (title, full HTML description,
// datePosted, hiringOrganization, jobLocation) — same shape as ACATE's
// Enlizt pages. Unlike Enlizt, there's no `jobLocationType` in the JSON-LD,
// so remote/hybrid/onsite modality is read separately off the plain-text
// label next to a small icon that appears on both the listing card and the
// detail page ("Home office" / "Híbrido" / "Presencial") — confirmed on this
// job (icon-user-home followed directly by "Home office" text).
//
// Some postings are placed by a staffing agency on behalf of an end client
// named only in the description text (e.g. "Empregga" listed as
// hiringOrganization, but the actual role is for a client "IdealTrack"
// mentioned only in the free text) — that distinction is left for the
// classify step to read, not modeled as a separate field.
//
// Not every job page has the JSON-LD block — confirmed live: 1 of the 4
// postings in the configured list_url has a real, live "Home office" job
// page but no `application/ld+json` script at all (no visible pattern to
// predict which ones; not an expired/blocked page, just a template gap on
// InfoJobs' side). Rather than dropping that record (SKILL.md: never
// silently drop a record), detail() falls back to scraping the same visible
// fields straight from the HTML: title from the `js_vacancyHeaderTitle` h2,
// description from the `<p class="mb-16 text-break white-space-pre-line">`
// block (confirmed present with the same class on both a JSON-LD page and
// this JSON-LD-less one), and location from the first
// `class="text-medium mb-4"` div following `id="VacancyHeader"` — the
// latter is confirmed working on the JSON-LD-less page but returned no
// match on a normal page when tested (its markup shifts slightly when a
// star-rating badge is present), so it's read as a best-effort extra, not
// assumed reliable — falls back to 'unknown' rather than throwing.

import { fetchText, htmlToText } from './_base.js';
import { makeRecord } from '../lib/normalize.js';

const MAX_PAGES = 50; // safety cap; the configured list_url only has 1 page today

export const sortedByRecency = false; // listing order not confirmed to be recency-based

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

// Looks for the small icon+label modality tag shared by listing and detail
// pages: "Home office" -> remote, "Híbrido" -> hybrid, "Presencial" -> onsite.
function extractModality(html) {
  if (/Home office/i.test(html)) return 'remote';
  if (/Híbrido/i.test(html)) return 'hybrid';
  if (/Presencial/i.test(html)) return 'onsite';
  return 'unknown';
}

export async function list(site) {
  const sep = site.list_url.includes('?') ? '&' : '?';
  const items = [];
  const seenIds = new Set();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await fetchText(`${site.list_url}${sep}Page=${page}`);
    const found = [...html.matchAll(/<div id="vacancy(\d+)"[^>]*data-href="([^"]+)"/g)];
    if (!found.length) break;
    for (const [, id, href] of found) {
      if (seenIds.has(id)) continue; // guard against an overlapping page, just in case
      seenIds.add(id);
      items.push({ externalId: id, url: new URL(href, 'https://www.infojobs.com.br').toString() });
    }
  }
  return items;
}

// Used only when the JSON-LD block is missing (see header comment).
function extractFallback(html) {
  const titleM = html.match(/js_vacancyHeaderTitle">([^<]+)<\/h2>/);
  const descM = html.match(/<p class="mb-16 text-break white-space-pre-line">([\s\S]*?)<\/p>/);
  const headerIdx = html.indexOf('id="VacancyHeader"');
  const headerWindow = headerIdx >= 0 ? html.slice(headerIdx, headerIdx + 3000) : '';
  const locM = headerWindow.match(/class="text-medium mb-4">\s*([^<\n]+?)\s*<\/div>/);
  return {
    title: titleM?.[1] || null,
    description: descM?.[1] || null,
    location: locM?.[1] || null,
  };
}

export async function detail(site, item) {
  const html = await fetchText(item.url);
  const job = extractJsonLd(html);

  if (job) {
    const addr = job.jobLocation?.address;
    const location = [addr?.addressLocality, addr?.addressRegion].filter(Boolean).join(', ') || 'unknown';
    return makeRecord({
      ats: 'infojobs',
      siteKey: site.key,
      company: job.hiringOrganization?.name || site.company,
      externalId: item.externalId,
      title: job.title || 'unknown',
      location,
      remoteType: extractModality(html),
      department: null,
      url: item.url,
      text: htmlToText(job.description),
      updatedAt: job.datePosted || null,
    });
  }

  const fb = extractFallback(html);
  return makeRecord({
    ats: 'infojobs',
    siteKey: site.key,
    company: site.company, // not reliably extractable from this template without JSON-LD
    externalId: item.externalId,
    title: fb.title || 'unknown',
    location: fb.location || 'unknown',
    remoteType: extractModality(html),
    department: null,
    url: item.url,
    text: htmlToText(fb.description || ''),
    updatedAt: null,
  });
}
