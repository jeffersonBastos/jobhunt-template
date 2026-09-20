// MercadoLibre's career page (mercadolibre.eightfold.ai) runs on Eightfold.ai.
// Unlike Greenhouse/Lever/Gupy, the page has no embedded JSON blob (checked:
// no __NEXT_DATA__, no apollo state) — it's a heavier client-rendered SPA that
// likely calls an internal API at runtime. Not yet implemented: needs a
// research spike (inspect the page's actual XHR calls, e.g. via a headless
// browser trace) before this adapter can be built for real. Fall back to
// headless-rendering + DOM parsing if no clean API is found.
//
// Stubbed so a run against this site fails loudly (logged to
// state/fetch-errors.log, isolated per-site) instead of silently.

const NOT_IMPLEMENTED = 'eightfold adapter not implemented yet — needs a research spike (see plan Open Items)';

export const sortedByRecency = true; // site supports sort_by=timestamp; re-confirm once implemented

export async function list() {
  throw new Error(NOT_IMPLEMENTED);
}

export async function detail() {
  throw new Error(NOT_IMPLEMENTED);
}
