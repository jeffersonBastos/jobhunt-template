// Fallback location -> region inference, used only when an explicit `region`
// tag isn't available (classify:false direct records, snapshots that predate
// this field, the one-off backfill). The classification step's own judgment
// (checklist.yaml's location-br-strong-company signal + reading the actual
// text) is authoritative when present — this is a best-effort string match
// for everything else, not a replacement for that reasoning.
const BR_LOCATION_RE = /\b(brazil|brasil|s(?:ã|a)o paulo|rio de janeiro|belo horizonte|curitiba|porto alegre|recife|salvador|fortaleza|bras[íi]lia|campinas|florian[óo]polis)\b/i;

export function inferRegion(location) {
  if (location && BR_LOCATION_RE.test(location)) return 'br';
  return 'intl';
}
