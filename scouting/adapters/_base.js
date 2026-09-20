const USER_AGENT = 'Mozilla/5.0 (compatible; jobhunt-scouting/1.0; personal use)';

async function withRetry(fn, { retries = 1, delayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function request(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return res;
}

export function fetchJson(url, opts) {
  return withRetry(async () => (await request(url, opts)).json());
}

export function fetchText(url, opts) {
  return withRetry(async () => (await request(url, opts)).text());
}

// Strip an HTML job-description blob down to plain text for the classify step.
// Keeps bullet structure (li -> "- ") so section boundaries stay legible.
//
// Greenhouse (and possibly others) store `content` as HTML-escaped text —
// tags come through as literal "&lt;li&gt;", not "<li>" — so entities must be
// decoded BEFORE tags are stripped, not after. &amp; is decoded first since
// some entities (e.g. a literal "&nbsp;" inside the original HTML) get
// double-escaped into "&amp;nbsp;" by that same escaping pass.
export function htmlToText(html) {
  if (!html) return '';
  const decoded = html
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
  return decoded
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Pull the Next.js server-rendered data blob out of an HTML page (used by
// Gupy career pages, and was how we first found iFood's underlying Greenhouse
// API before switching to that API directly).
export function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}
