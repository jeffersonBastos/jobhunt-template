# job-scout — open items

## Eightfold adapter (MercadoLibre) — needs a research spike

`adapters/eightfold.js` is currently a stub (throws "not implemented"). The
`mercadolibre` entry in `config/sites.yaml` has `status: needs-research-spike`
and fails loudly on every `fetch` run (logged to `state/fetch-errors.log`,
doesn't block other sites).

**What's been ruled out so far**, so the next attempt doesn't repeat it:
- No embedded JSON in the page HTML — checked for `__NEXT_DATA__`, Apollo
  state, and similar patterns used by Greenhouse/Gupy/Paradigm. None found;
  Eightfold's careers page is a heavier client-rendered SPA (jQuery/Backbone
  -era bundle, not Next.js).
- Guessed `https://mercadolibre.eightfold.ai/api/apply/v2/jobs?...` as a
  likely internal API path. Inconsistent results on two tries: first request
  returned `429` with a plain-text body ("Please try again later" — not the
  SPA shell, suggesting it *might* be a real rate-limited endpoint), second
  request returned `404` with the full HTML app shell (suggesting the guess
  is wrong, or the route only responds under specific conditions/headers).
  Inconclusive either way — didn't keep guessing further to avoid hammering
  their infra with speculative requests.

**Fastest next step (recommended): check DevTools manually first.** Before
writing any more scraping/guessing code, open
`https://mercadolibre.eightfold.ai/careers?...` in a real browser, open the
Network tab, filter to XHR/Fetch, and reload. The real internal API call
(with its actual path, query params, and any required headers) will be right
there — much faster and more reliable than guessing endpoints blind. If
you do this and paste the real request, the adapter can likely be
built same-session from that alone (same pattern as the other 4 adapters:
one clean JSON endpoint = one file).

**If no clean API turns up even from DevTools:** fall back to headless
rendering (Playwright or Puppeteer — not yet a dependency of this project)
to load the page and either (a) intercept the same XHR the browser makes, or
(b) parse the rendered DOM directly. Heavier than the other adapters; only
worth it if MercadoLibre postings turn out to matter enough to justify a new
dependency.

## Other known gaps (lower priority, not blocking)

- **Paradigm aggregator**: ~134 of ~205 relevant postings are on custom
  career pages (Stripe, Zipline, Citadel Securities, etc.) with no ATS
  fingerprint matched — these surface as "needs a manual look" in the report
  rather than being auto-classified. Each would need its own one-off adapter
  if worth the effort; not attempted given the volume.
- **Lever adapter** is built and verified against real live data
  (whoop.lever.co) but has no company in the registry yet — no bugs known,
  just unproven against an actual tracked site.
- **Two separate Gupy adapters exist — don't conflate them.**
  `adapters/gupy.js` handles a single company's own Gupy subdomain (e.g.
  ambevtech.gupy.io) via its `__NEXT_DATA__` blob; verified live but still
  has no company in the registry. `adapters/gupy-portal.js` (added
  2026-07-23) is a different, separate adapter for Gupy's own marketplace
  aggregator (portal.gupy.io/job-search, ~85k postings across every company
  on Gupy) via the public `employability-portal.gupy.io/api/v1/jobs`
  endpoint found in the portal's JS bundles — registered as the
  `gupy-portal` site, `status: needs-verification` until a real fetch+
  finalize run is confirmed clean.
